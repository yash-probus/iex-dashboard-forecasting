import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { CalculationStep } from "./types";
import { ProltLoaderAnimation } from "@/components/ProltLoaderAnimation";

interface ProgressModalProps {
  open: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

const STEPS: CalculationStep[] = [
  { 
    id: 1, 
    title: "Parsing uploaded bills", 
    description: "Reading your DISCOM and OA bill data...",
    duration: 2500,
    completed: false 
  },
  { 
    id: 2, 
    title: "Mapping OA obligations → slots", 
    description: "Aligning IEX trades to 15-min intervals...",
    duration: 2000,
    completed: false 
  },
  { 
    id: 3, 
    title: "Splitting monthly ToD → 15-min slots", 
    description: "Distributing consumption across time blocks...",
    duration: 1500,
    completed: false 
  },
  { 
    id: 4, 
    title: "Fetching IEX history & model predictions", 
    description: "Analyzing historical price patterns...",
    duration: 3500,
    completed: false 
  },
  { 
    id: 5, 
    title: "Computing per-slot landed OA cost", 
    description: "Adding STU/SLDC/CTU/NLDC charges...",
    duration: 2500,
    completed: false 
  },
  { 
    id: 6, 
    title: "Applying OA share constraints", 
    description: "Optimizing DISCOM vs OA per slot...",
    duration: 2000,
    completed: false 
  },
  { 
    id: 7, 
    title: "Generating outputs", 
    description: "Finalizing your personalized savings report...",
    duration: 2000,
    completed: false 
  },
];

export function ProgressModal({ open, onCancel, onComplete }: ProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<CalculationStep[]>(STEPS.map(s => ({ ...s, completed: false })));
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setProgress(0);
      setCurrentStepIndex(0);
      setSteps(STEPS.map(s => ({ ...s, completed: false })));
      setCancelled(false);
      return;
    }

    if (cancelled) return;

    const totalDuration = STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    // Progress bar animation
    const progressInterval = setInterval(() => {
      if (cancelled) return;
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    // Step completion simulation
    let stepDelay = 0;
    const timeouts: NodeJS.Timeout[] = [];
    
    STEPS.forEach((step, index) => {
      stepDelay += step.duration;
      const timeout = setTimeout(() => {
        if (cancelled) return;
        setSteps(prev => prev.map((s, i) => 
          i === index ? { ...s, completed: true } : s
        ));
        setCurrentStepIndex(index + 1);
        
        if (index === STEPS.length - 1) {
          setTimeout(() => {
            if (!cancelled) onComplete();
          }, 500);
        }
      }, stepDelay);
      timeouts.push(timeout);
    });

    return () => {
      clearInterval(progressInterval);
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [open, cancelled, onComplete]);

  const handleCancel = () => {
    setCancelled(true);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg [&>button]:hidden">
        <div className="space-y-6 py-4">
          {/* Prolt Animated Loader */}
          <div className="flex justify-center">
            <ProltLoaderAnimation 
              progress={progress} 
              size="md"
            />
          </div>

          {/* Steps */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-start gap-3 p-3 rounded-lg transition-all
                  ${step.completed 
                    ? 'bg-success/10' 
                    : index === currentStepIndex 
                    ? 'bg-accent/10' 
                    : 'bg-muted/30'
                  }
                `}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                  ${step.completed 
                    ? 'bg-success text-success-foreground' 
                    : index === currentStepIndex 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {step.completed ? (
                    <Check className="w-4 h-4" />
                  ) : index === currentStepIndex ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{step.id}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${step.completed ? 'text-success' : ''}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full gap-2"
          >
            <X className="w-4 h-4" />
            Cancel Calculation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
