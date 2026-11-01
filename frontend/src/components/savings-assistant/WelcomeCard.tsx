import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, PenLine, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface WelcomeCardProps {
  onUploadPath: () => void;
  onManualPath: () => void;
}

export function WelcomeCard({ onUploadPath, onManualPath }: WelcomeCardProps) {
  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardContent className="p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-accent" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Do you have monthly bills to upload?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Upload your DISCOM and OA bills for accurate analysis, or enter your
            ToD consumption manually.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            // onClick={onUploadPath}
            onClick={() =>
              toast.info(
                "Feature under development, Please try after some time"
              )
            }
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-8"
          >
            <Upload className="w-5 h-5" />
            Upload Bills
          </Button>

          <Button
            onClick={onManualPath}
            variant="outline"
            size="lg"
            className="gap-2 px-8"
          >
            <PenLine className="w-5 h-5" />
            Enter ToD Manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
