import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Phone, CheckCircle2, Loader2, Shield, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMoneyPaymentProps {
  amount: number;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentCancel?: () => void;
}

type Provider = "flooz" | "tmoney";

interface PaymentState {
  status: "idle" | "pending" | "processing" | "success" | "failed";
  transactionId?: string;
  errorMessage?: string;
}

const PROVIDERS = {
  flooz: {
    name: "Flooz",
    color: "bg-orange-500",
    logo: "🟠",
    prefix: "+22890",
    description: "Moov Africa"
  },
  tmoney: {
    name: "T-Money",
    color: "bg-blue-500",
    logo: "🔵",
    prefix: "+22870",
    description: "Togocel"
  }
};

export function MobileMoneyPayment({ amount, onPaymentSuccess, onPaymentCancel }: MobileMoneyPaymentProps) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider>("flooz");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: "idle" });
  const [countdown, setCountdown] = useState(0);

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^\+228[0-9]{8}$/;
    return phoneRegex.test(cleanPhone);
  };

  const formatPhoneDisplay = (phone: string): string => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    if (clean.length <= 7) return `${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`;
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits and + at start
    let cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    } else {
      cleaned = cleaned.replace(/\+/g, '');
    }
    setPhoneNumber(cleaned);
  };

  const generateTransactionId = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  };

  const initiatePayment = async () => {
    if (!validatePhone(phoneNumber)) {
      toast({
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro au format +228XXXXXXXX",
        variant: "destructive",
      });
      return;
    }

    setPaymentState({ status: "pending" });
    setCountdown(120); // 2 minutes timeout

    // Simulate payment initiation - In production, this would call your API
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPaymentState({ status: "processing" });
      
      toast({
        title: "Demande envoyée",
        description: `Veuillez confirmer le paiement de ${amount.toLocaleString()} FCFA sur votre téléphone ${PROVIDERS[provider].name}`,
      });

      // Simulate waiting for payment confirmation (in production, this would poll your API)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const transactionId = generateTransactionId();
      setPaymentState({ status: "success", transactionId });
      
      toast({
        title: "Paiement réussi!",
        description: `Transaction ${transactionId} confirmée`,
      });

      setTimeout(() => {
        onPaymentSuccess(transactionId);
      }, 1500);

    } catch (error) {
      setPaymentState({ 
        status: "failed", 
        errorMessage: "Échec du paiement. Veuillez réessayer." 
      });
      toast({
        title: "Échec du paiement",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && paymentState.status === "processing") {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && paymentState.status === "processing") {
      setPaymentState({ 
        status: "failed", 
        errorMessage: "Délai d'attente dépassé. Veuillez réessayer." 
      });
    }
  }, [countdown, paymentState.status]);

  const resetPayment = () => {
    setPaymentState({ status: "idle" });
    setCountdown(0);
  };

  if (paymentState.status === "success") {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-success">Paiement confirmé!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Transaction: {paymentState.transactionId}
              </p>
            </div>
            <p className="text-sm">Redirection en cours...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Paiement de validation</CardTitle>
        </div>
        <CardDescription>
          Frais de traitement: <span className="font-semibold text-foreground">{amount.toLocaleString()} FCFA</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {paymentState.status === "failed" && (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Échec du paiement</p>
              <p className="text-xs text-muted-foreground">{paymentState.errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetPayment}>
              Réessayer
            </Button>
          </div>
        )}

        {(paymentState.status === "idle" || paymentState.status === "failed") && (
          <>
            {/* Provider Selection */}
            <div className="space-y-3">
              <Label>Opérateur Mobile Money</Label>
              <RadioGroup
                value={provider}
                onValueChange={(v) => setProvider(v as Provider)}
                className="grid grid-cols-2 gap-3"
              >
                {(Object.entries(PROVIDERS) as [Provider, typeof PROVIDERS.flooz][]).map(([key, p]) => (
                  <Label
                    key={key}
                    htmlFor={key}
                    className={cn(
                      "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all",
                      provider === key 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={key} id={key} className="sr-only" />
                    <span className="text-2xl">{p.logo}</span>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="mm-phone">Numéro {PROVIDERS[provider].name}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mm-phone"
                  type="tel"
                  placeholder="+228 90 12 34 56"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Entrez le numéro associé à votre compte {PROVIDERS[provider].name}
              </p>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Paiement sécurisé. Vous recevrez une notification sur votre téléphone pour confirmer la transaction.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              {onPaymentCancel && (
                <Button variant="outline" className="flex-1" onClick={onPaymentCancel}>
                  Annuler
                </Button>
              )}
              <Button 
                className="flex-1 gap-2" 
                onClick={initiatePayment}
                disabled={!validatePhone(phoneNumber)}
              >
                <CreditCard className="w-4 h-4" />
                Payer {amount.toLocaleString()} FCFA
              </Button>
            </div>
          </>
        )}

        {(paymentState.status === "pending" || paymentState.status === "processing") && (
          <div className="text-center space-y-4 py-6">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="font-medium">
                {paymentState.status === "pending" ? "Envoi de la demande..." : "En attente de confirmation"}
              </h3>
              {paymentState.status === "processing" && (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    Veuillez confirmer le paiement sur votre téléphone
                  </p>
                  <p className="text-sm font-mono mt-2">
                    Temps restant: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </p>
                </>
              )}
            </div>
            <Button variant="outline" onClick={resetPayment} className="mt-4">
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
