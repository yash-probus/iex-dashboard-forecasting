// @ts-nocheck

import { User, LogOut, FileText, Settings, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { clearAuth, getUserType } from "@/lib/auth";
import authService from "@/api/authService";

const ProfileMenu = () => {
  const navigate = useNavigate();
  const userType = getUserType();

  const handleLogout = () => {
    clearAuth();
    localStorage.clear();
    navigate("/");
  };

  const handleLogs = () => {
    navigate("/logs");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const handleProfile = () => {
    if (userType === "consumer") {
      navigate("/consumer-profile");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        {/* <DropdownMenuLabel>My Account</DropdownMenuLabel> */}
        {/* <DropdownMenuSeparator />
        {userType === "consumer" && (
          <DropdownMenuItem onSelect={handleProfile} className="cursor-pointer">
            <UserCircle className="mr-2 w-4 h-4" />
            My Profile
          </DropdownMenuItem>
        )} */}
        {/* <DropdownMenuItem onSelect={handleSettings} className="cursor-pointer">
          <Settings className="mr-2 w-4 h-4" />
          Settings
        </DropdownMenuItem> */}
        {/* <DropdownMenuItem onSelect={handleLogs} className="cursor-pointer">
          <FileText className="mr-2 w-4 h-4" />
          Logs
        </DropdownMenuItem> */}

        <div className="py-2 pl-1 flex items-center gap-2 text-[#2E51FF] font-semibold">
          {" "}
          <User size={16} /> {authService.getUserName()}
        </div>

        <hr className="border-gray-200 h-2 mb-2" />

        <DropdownMenuItem
          onSelect={handleLogout}
          className="cursor-pointer hover:!bg-[#2E51FF] hover:text-white text-black"
        >
          <LogOut className="mr-2 w-4 h-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
