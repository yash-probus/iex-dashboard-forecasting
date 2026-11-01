// @ts-nocheck

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

interface KPIData {
  dailySavings: number;
  loadFactor: number;
  activeBids: number;
  totalConsumption: number;
}

interface ResumeAction {
  id: string;
  title: string;
  progress: number;
  lastUpdated: string;
  type: "bill_upload" | "energy_request" | "profile";
  href: string;
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  time: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  isNew: boolean;
}

interface ReturningUserData {
  kpis: KPIData;
  resumeAction: ResumeAction | null;
  alerts: Alert[];
  notifications: Notification[];
  profileCompletion: number;
  isLoading: boolean;
  error: string | null;
}

export function useReturningUserData(): ReturningUserData {
  const { userState } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<
    Omit<ReturningUserData, "isLoading" | "error">
  >({
    kpis: {
      dailySavings: 0,
      loadFactor: 0,
      activeBids: 0,
      totalConsumption: 0,
    },
    resumeAction: null,
    alerts: [],
    notifications: [],
    profileCompletion: 0,
  });

  useEffect(() => {
    async function fetchData() {
      if (!userState.isLoggedIn) {
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch profile data
        const { data: profileData } = await supabase
          .from("consumer_profiles")
          .select("*, consumer_industries(*), consumer_bills(*)")
          .eq("user_id", user.id)
          .single();

        // Fetch energy requests (active bids)
        const { data: energyRequests } = await supabase
          .from("energy_requests")
          .select("*")
          .eq("profile_id", profileData?.id || "")
          .order("created_at", { ascending: false });

        // Calculate profile completion
        let completion = 25; // Base completion for having an account
        if (profileData) {
          if (profileData.gst_verified) completion += 15;
          if (
            profileData.consumer_industries &&
            profileData.consumer_industries.length > 0
          )
            completion += 20;
          if (
            profileData.consumer_bills &&
            profileData.consumer_bills.length > 0
          )
            completion += 20;
          if (profileData.uses_open_access !== null) completion += 10;
          if (profileData.has_prolt_meter !== null) completion += 10;
        }

        // Determine resume action
        let resumeAction: ResumeAction | null = null;

        // Check for incomplete energy requests
        const pendingRequest = energyRequests?.find(
          (r) => r.status === "draft",
        );
        if (pendingRequest) {
          resumeAction = {
            id: pendingRequest.id,
            title: `Energy Request - ${pendingRequest.market_type}`,
            progress: 50,
            lastUpdated: formatTimeAgo(new Date(pendingRequest.updated_at)),
            type: "energy_request",
            href: "/energy-request",
          };
        } else if (profileData && !profileData.onboarding_completed) {
          // Check for incomplete onboarding
          resumeAction = {
            id: "onboarding",
            title: "Complete Your Profile Setup",
            progress: completion,
            lastUpdated: formatTimeAgo(new Date(profileData.updated_at)),
            type: "profile",
            href: "/consumer-onboarding",
          };
        } else if (
          profileData &&
          (!profileData.consumer_bills ||
            profileData.consumer_bills.length === 0)
        ) {
          // Check for missing bill uploads
          resumeAction = {
            id: "bill_upload",
            title: "Upload Your First Bill",
            progress: 0,
            lastUpdated: "Not started",
            type: "bill_upload",
            href: "/bills-documents",
          };
        }

        // Calculate KPIs
        const activeBids =
          energyRequests?.filter(
            (r) => r.status === "pending" || r.status === "acknowledged",
          ).length || 0;

        // Calculate estimated daily savings based on consumption
        const totalLoad =
          energyRequests?.reduce((sum, r) => sum + (r.total_load_mw || 0), 0) ||
          0;
        const estimatedDailySavings = Math.round(
          totalLoad * 1000 * 0.5 * 24 * 0.8,
        ); // Simplified calculation

        // Load factor calculation (mock based on profile data)
        const loadFactor = profileData?.consumer_industries?.[0]
          ?.sanctioned_load
          ? 0.75 + Math.random() * 0.15
          : 0;

        // Generate alerts based on real data
        const alerts: Alert[] = [];

        // Check for rejected requests
        const rejectedRequests = energyRequests?.filter(
          (r) => r.status === "rejected",
        );
        if (rejectedRequests && rejectedRequests.length > 0) {
          alerts.push({
            id: rejectedRequests[0].id,
            type: "critical",
            title: "Bid Rejection Alert",
            message: `${rejectedRequests[0].market_type} bid for ${rejectedRequests[0].total_load_mw} MW was rejected`,
            time: formatTimeAgo(new Date(rejectedRequests[0].updated_at)),
          });
        }

        // Check for pending requests approaching deadline
        const pendingRequests = energyRequests?.filter(
          (r) => r.status === "pending",
        );
        if (pendingRequests && pendingRequests.length > 0) {
          const oldestPending = pendingRequests[pendingRequests.length - 1];
          const createdAt = new Date(oldestPending.created_at);
          const hoursSinceCreation =
            (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceCreation > 12) {
            alerts.push({
              id: oldestPending.id + "_warning",
              type: "warning",
              title: "Request Pending Review",
              message: `Your ${oldestPending.market_type} request has been pending for ${Math.round(hoursSinceCreation)} hours`,
              time: formatTimeAgo(createdAt),
            });
          }
        }

        // Add profile completion alert if low
        if (completion < 75) {
          alerts.push({
            id: "profile_incomplete",
            type: "info",
            title: "Complete Your Profile",
            message: `Your profile is ${completion}% complete. Add more details to unlock all features.`,
            time: "Action needed",
          });
        }

        // Generate notifications
        const notifications: Notification[] = [
          {
            id: "notif_1",
            title: "New CERC Guidelines on RTM",
            description: "Updated settlement mechanism for real-time market",
            time: "3 hours ago",
            isNew: true,
          },
          {
            id: "notif_2",
            title: "IEX Price Alert",
            description: "Average clearing price dropped below ₹4.50/kWh",
            time: "5 hours ago",
            isNew: true,
          },
        ];

        // Add notification for recent request status changes
        const recentAcknowledged = energyRequests?.find(
          (r) =>
            r.status === "acknowledged" &&
            Date.now() - new Date(r.updated_at).getTime() < 24 * 60 * 60 * 1000,
        );
        if (recentAcknowledged) {
          notifications.unshift({
            id: `request_${recentAcknowledged.id}`,
            title: "Energy Request Acknowledged",
            description: `Your ${recentAcknowledged.market_type} request for ${recentAcknowledged.total_load_mw} MW has been acknowledged`,
            time: formatTimeAgo(new Date(recentAcknowledged.updated_at)),
            isNew: true,
          });
        }

        setData({
          kpis: {
            dailySavings: estimatedDailySavings || 45000, // Fallback for demo
            loadFactor: loadFactor || 0.88,
            activeBids,
            totalConsumption: totalLoad * 1000,
          },
          resumeAction,
          alerts:
            alerts.length > 0
              ? alerts
              : [
                  // Fallback demo alerts if no real alerts
                  {
                    id: "demo_1",
                    type: "warning",
                    title: "Market Update",
                    message: "IEX prices are favorable for DAM bids today",
                    time: "2 hours ago",
                  },
                ],
          notifications,
          profileCompletion: completion,
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching returning user data:", err);
        setError("Failed to load dashboard data");
        setIsLoading(false);
      }
    }

    fetchData();
  }, [userState.isLoggedIn]);

  return {
    ...data,
    isLoading,
    error,
  };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}
