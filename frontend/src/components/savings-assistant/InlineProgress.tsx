import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CalculationStep } from "./types";
import { ProltLoaderAnimation } from "@/components/ProltLoaderAnimation";

interface InlineProgressProps {
  isActive: boolean;
  isFinished?: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

const STEPS: CalculationStep[] = [
  {
    id: 1,
    title: "Parsing uploaded bills",
    description: "Reading your DISCOM and OA bill data...",
    duration: 2500,
    completed: false,
  },
  {
    id: 2,
    title: "Mapping OA obligations → slots",
    description: "Aligning IEX trades to 15-min intervals...",
    duration: 2000,
    completed: false,
  },
  {
    id: 3,
    title: "Splitting monthly ToD → 15-min slots",
    description: "Distributing consumption across time blocks...",
    duration: 1500,
    completed: false,
  },
  {
    id: 4,
    title: "Fetching IEX history & predictions",
    description: "Analyzing historical price patterns...",
    duration: 3500,
    completed: false,
  },
  {
    id: 5,
    title: "Computing per-slot OA cost",
    description: "Adding STU/SLDC/CTU/NLDC charges...",
    duration: 2500,
    completed: false,
  },
  {
    id: 6,
    title: "Applying OA share constraints",
    description: "Optimizing DISCOM vs OA per slot...",
    duration: 2000,
    completed: false,
  },
  {
    id: 7,
    title: "Generating outputs",
    description: "Finalizing your personalized savings report...",
    duration: 2000,
    completed: false,
  },
];

export function InlineProgress({
  isActive,
  isFinished,
  onCancel,
  onComplete,
}: InlineProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<CalculationStep[]>(
    STEPS.map((s) => ({ ...s, completed: false })),
  );
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setCurrentStepIndex(0);
      setSteps(STEPS.map((s) => ({ ...s, completed: false })));
      setCancelled(false);
      return;
    }

    if (cancelled) return;

    const totalDuration = isFinished
      ? 2000 // Total 2 seconds for rapid completion
      : STEPS.reduce((sum, s) => sum + s.duration, 0);

    let elapsed = 0;
    // If we're already partway through, we should ideally start from current progress
    // but for simplicity in a rapid mode, we'll just speed up from where it is.

    const tickRate = isFinished ? 50 : 100;
    const progressInterval = setInterval(() => {
      if (cancelled) return;

      // If finished, we want to reach 100% quickly but smoothly
      if (isFinished) {
        setProgress((prev) => Math.min(prev + 100 / (2000 / tickRate), 100));
      } else {
        elapsed += tickRate;
        const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
        setProgress(newProgress);
      }
    }, tickRate);

    const timeouts: NodeJS.Timeout[] = [];

    if (isFinished) {
      // Rapidly complete remaining steps
      const remainingSteps = steps
        .map((s, i) => ({ s, i }))
        .filter((x) => !x.s.completed);
      remainingSteps.forEach((x, idx) => {
        const timeout = setTimeout(
          () => {
            if (cancelled) return;
            setSteps((prev) =>
              prev.map((s, i) => (i === x.i ? { ...s, completed: true } : s)),
            );
            setCurrentStepIndex(x.i + 1);

            if (idx === remainingSteps.length - 1) {
              setTimeout(() => {
                if (!cancelled) onComplete();
              }, 600);
            }
          },
          (idx + 1) * 300,
        ); // 300ms per remaining step
        timeouts.push(timeout);
      });

      // If all steps were somehow already completed (unlikely but safe)
      if (remainingSteps.length === 0) {
        const timeout = setTimeout(() => {
          if (!cancelled) onComplete();
        }, 800);
        timeouts.push(timeout);
      }
    } else {
      let stepDelay = 0;
      STEPS.forEach((step, index) => {
        stepDelay += step.duration;
        const timeout = setTimeout(() => {
          if (cancelled) return;
          setSteps((prev) =>
            prev.map((s, i) => (i === index ? { ...s, completed: true } : s)),
          );
          setCurrentStepIndex(index + 1);

          if (index === STEPS.length - 1) {
            setTimeout(() => {
              if (!cancelled) onComplete();
            }, 500);
          }
        }, stepDelay);
        timeouts.push(timeout);
      });
    }

    return () => {
      clearInterval(progressInterval);
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [isActive, isFinished, cancelled, onComplete]);

  const handleCancel = () => {
    setCancelled(true);
    onCancel();
  };

  if (!isActive) return null;

  return (
    <Card className="border-accent/30 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Compact Loader */}
          <div className="flex-shrink-0">
            <ProltLoaderAnimation progress={progress} size="sm" />
          </div>

          {/* Progress Content */}
          <div className="flex-1 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Calculating Savings...</span>
                <span className="text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Current Step */}
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
              {currentStepIndex < STEPS.length ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <div>
                    <p className="text-sm font-medium">
                      {steps[currentStepIndex]?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {steps[currentStepIndex]?.description}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-success" />
                  <p className="text-sm font-medium text-success">
                    Calculation Complete!
                  </p>
                </>
              )}
            </div>

            {/* Step indicators */}
            <div className="flex gap-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    step.completed
                      ? "bg-success"
                      : index === currentStepIndex
                        ? "bg-accent animate-pulse"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Cancel Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
