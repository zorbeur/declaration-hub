import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface MathCaptchaProps {
  onVerified: (verified: boolean) => void;
}

export function MathCaptcha({ onVerified }: MathCaptchaProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<"+" | "-" | "×">("+");
  const [answer, setAnswer] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasError, setHasError] = useState(false);

  const generateCaptcha = useCallback(() => {
    const ops: ("+" | "-" | "×")[] = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    setOperator(op);

    let n1, n2;
    if (op === "×") {
      n1 = Math.floor(Math.random() * 10) + 1;
      n2 = Math.floor(Math.random() * 10) + 1;
    } else if (op === "-") {
      n1 = Math.floor(Math.random() * 50) + 10;
      n2 = Math.floor(Math.random() * n1);
    } else {
      n1 = Math.floor(Math.random() * 50) + 1;
      n2 = Math.floor(Math.random() * 50) + 1;
    }
    
    setNum1(n1);
    setNum2(n2);
    setAnswer("");
    setIsVerified(false);
    setHasError(false);
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const getCorrectAnswer = (): number => {
    switch (operator) {
      case "+": return num1 + num2;
      case "-": return num1 - num2;
      case "×": return num1 * num2;
      default: return 0;
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    setHasError(false);

    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue === getCorrectAnswer()) {
      setIsVerified(true);
      onVerified(true);
    } else {
      setIsVerified(false);
      onVerified(false);
    }
  };

  const handleBlur = () => {
    if (answer && !isVerified) {
      setHasError(true);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Vérification anti-spam</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={generateCaptcha}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-md border font-mono text-lg">
          <span>{num1}</span>
          <span className="text-primary">{operator}</span>
          <span>{num2}</span>
          <span>=</span>
          <span className="text-muted-foreground">?</span>
        </div>
        
        <Input
          type="number"
          value={answer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Réponse"
          className={`w-24 text-center ${
            isVerified 
              ? "border-success focus-visible:ring-success" 
              : hasError 
                ? "border-destructive focus-visible:ring-destructive" 
                : ""
          }`}
        />
        
        {isVerified && <CheckCircle className="h-5 w-5 text-success" />}
        {hasError && <XCircle className="h-5 w-5 text-destructive" />}
      </div>
      
      {hasError && (
        <p className="text-sm text-destructive">Réponse incorrecte. Veuillez réessayer.</p>
      )}
    </div>
  );
}
