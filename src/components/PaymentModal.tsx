import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import kenyaFlag from "@/assets/kenya.png";
import madagascarFlag from "@/assets/madagascar.png";
import tanzaniaFlag from "@/assets/tz.png";
import moroccoFlag from "@/assets/mar.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressOverlay } from "@/components/ui/progress-overlay";
import { CreditCard, Smartphone, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { payHeroService } from "@/lib/payhero-service";
import { PAYMENT_PROVIDERS } from "@/lib/payhero-config";
import ETicket from "./ETicket";

interface TicketData {
  ticketId: string;
  matchDate: string;
  matchTime: string;
  teamA: string;
  teamB: string;
  venue: string;
  ticketType: string;
  quantity: number;
  totalAmount: string;
  holderEmail: string;
  holderName: string;
  gate: string;
  section: string;
  row: string;
  gateOpenTime: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  ticketDetails: {
    type: string;
    quantity: number;
    matchId: string;
  };
}

// Match data constant
const matchesData = {
  "1": {
    teamA: "MAD",
    teamB: "MAR",
    teamACode: "MAD",
    teamBCode: "MAR",
    teamAFlag: madagascarFlag,
    teamBFlag: moroccoFlag,
    date: "30 Aug 2025",
    time: "18:00",
    venue: "Moi Sports Centre Kasarani",
    gateOpenTime: "15:00"
  },
  // "2": {
  //   teamA: "Tanzania",
  //   teamB: "Morocco",
  //   teamACode: "TZ",
  //   teamBCode: "MAR",
  //   teamAFlag: tanzaniaFlag,
  //   teamBFlag: moroccoFlag,
  //   date: "22 Aug 2025",
  //   time: "20:00",
  //   venue: "Benjamin Mkapa National Stadium",
  //   gateOpenTime: "18:00"
  // }
};

const PaymentModal = ({ isOpen, onClose, amount, ticketDetails }: PaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });
  const [showETicket, setShowETicket] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const { toast } = useToast();

  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiating' | 'pending' | 'success' | 'failed' | null>('idle');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<{ main: string; sub: string } | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);

  // Progress increment interval (3 minutes total)
  useEffect(() => {
    if (paymentStatus === 'pending') {
      const totalDuration = 180000; // 3 minutes
      const incrementInterval = 1000; // 1 second
      const incrementValue = (100 / (totalDuration / incrementInterval));
      
      const interval = setInterval(() => {
        setProgressValue(prev => {
          const newValue = prev + incrementValue;
          return newValue > 98 ? 98 : newValue; // Never reach 100% automatically
        });
      }, incrementInterval);

      return () => clearInterval(interval);
    } else if (paymentStatus === 'success') {
      setProgressValue(100);
    } else if (paymentStatus === 'idle' || paymentStatus === 'failed') {
      setProgressValue(0);
    }
  }, [paymentStatus]);

  // Function to check payment status according to PayHero v2 API
  const checkPaymentStatus = async (txnId: string) => {
    if (!txnId) {
      setPaymentError('Invalid transaction reference');
      return;
    }

    try {
      const statusResponse = await payHeroService.checkPaymentStatus(txnId);
      
      if (statusResponse.success) {
        // Get status from response
        const status = statusResponse.status;
        const providerRef = statusResponse.provider_reference || 
                          statusResponse.third_party_reference;
                           
        // If we have a provider reference and status is SUCCESS, payment is confirmed
        if (providerRef && status === 'SUCCESS') {
          setPaymentStatus('success');
          setPaymentError(null);
          clearPollingAndGenerateTicket();
          // Close payment modal after success
          onClose();
          return; // Exit early on confirmed success
        }

        // Handle each status according to PayHero documentation
        switch (status) {
          case 'SUCCESS':
            setPaymentStatus('success');
            setPaymentError(null);
            clearPollingAndGenerateTicket();
            // Close payment modal after success
            onClose();
            break;
            
          case 'FAILED':
            handlePaymentFailure('Payment was unsuccessful. Please try again.');
            break;
            
          case 'QUEUED':
            // Payment request is queued, continue polling
            setPaymentStatus('pending');
            setProgressMessage({
              main: "Payment Request Queued",
              sub: "Please wait while we process your request..."
            });
            break;
            
          case 'PENDING':
            // STK push sent, waiting for user action
            setPaymentStatus('pending');
            setProgressMessage({
              main: "Check Your Phone",
              sub: "Enter your M-PESA PIN to complete payment"
            });
            break;
            
          case 'PROCESSING':
            // Payment is being processed
            setPaymentStatus('pending');
            setProgressMessage({
              main: "Confirming Payment",
              sub: "Please wait while we verify your transaction..."
            });
            break;
            
          default:
            // Log the unexpected status for debugging (without sensitive data)
            console.log('Unexpected payment status:', status);
            handlePaymentFailure('Unable to determine payment status');
        }
      } else {
        // Check for specific error codes without exposing details
        const errorCode = statusResponse.error?.code || 'UNKNOWN';
        switch(errorCode) {
          case 'TIMEOUT':
            handlePaymentFailure('Request timed out. Please try again.');
            break;
          case 'INVALID_ACCOUNT':
            handlePaymentFailure('Invalid M-PESA account. Please check your number.');
            break;
          default:
            handlePaymentFailure('Payment verification failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      
      // Check if response is not JSON (e.g., HTML error page)
      if (error instanceof SyntaxError && (error.message.includes('Unexpected token') || error.message.includes('<!DOCTYPE'))) {
        // If initial status check fails, we might be too early
        if (!pollingInterval) {
          // First check failed - likely just need to wait longer
          setProgressMessage({
            main: "Processing Payment",
            sub: "Please wait while we confirm your payment..."
          });
          return; // Let polling continue
        }
        
        // If we've been polling and still getting errors
        toast({
          title: "Connection Issue",
          description: "Having trouble checking payment status. Keep your M-PESA phone ready, we'll continue checking.",
          duration: 5000
        });
        return; // Continue polling
      }
      
      // If we're still polling, show a connection issue message
      if (pollingInterval) {
        toast({
          title: "Checking Payment",
          description: "If you've completed the M-PESA payment, don't worry - we'll keep checking and your ticket will be generated automatically.",
          duration: 5000
        });
        return; // Continue polling
      }
      
      // For initial non-polling errors, show a more specific message
      handlePaymentFailure('Unable to verify payment status. If you completed the payment, your ticket will be generated automatically when verification succeeds.');
    }
  };

  // Helper function to clear polling and generate ticket
  const clearPollingAndGenerateTicket = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    generateTicketData();
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed successfully. Your e-ticket is ready.",
    });
  };

  // Helper function to handle payment failures
  const handlePaymentFailure = (userMessage: string) => {
    setPaymentStatus('failed');
    setPaymentError(userMessage);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    toast({
      title: "Payment Failed",
      description: userMessage,
      variant: "destructive"
    });
  };

  // Generate ticket data after successful payment
  const generateTicketData = () => {
    const gates = ["Gate 1", "Gate 2", "Gate 3"];
    const sections = ["17-Lower", "18-Upper", "19-Lower", "20-Upper"];
    const rows = Array.from({length: 20}, (_, i) => i + 1);
    
    const ticketId = transactionId ? `${transactionId.slice(-6)}` : `CHAN${Date.now().toString().slice(-6)}`;
    
    const matchData = matchesData[ticketDetails.matchId as keyof typeof matchesData];
    
    const eTicketData = {
      ticketId,
      matchDate: matchData.date,
      matchTime: matchData.time,
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      venue: matchData.venue,
      ticketType: ticketDetails.type,
      quantity: ticketDetails.quantity,
      totalAmount: amount,
      holderEmail: email,
      holderName: fullName,
      gate: gates[Math.floor(Math.random() * gates.length)],
      section: sections[Math.floor(Math.random() * sections.length)],
      row: rows[Math.floor(Math.random() * rows.length)].toString(),
      gateOpenTime: matchData.gateOpenTime
    };
    
    setTicketData(eTicketData);
    setShowETicket(true);
  };

  // Cleanup on unmount and state changes
  useEffect(() => {
    // Cleanup function to handle all intervals and states
    const cleanupPaymentState = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setPaymentError(null);
      setIsProcessing(false);
      setProgressValue(0);
      setProgressMessage(null);
    };

    // If modal is closed, reset all states
    if (!isOpen) {
      setPaymentStatus('idle');
      cleanupPaymentState();
    }

    // Cleanup on unmount
    return cleanupPaymentState;
  }, [isOpen, pollingInterval]);

  const initiatePayHeroPayment = async (phoneNumber: string): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    try {
      setPaymentStatus('initiating');
      setPaymentError(null);
      setProgressMessage({
        main: "Initiating Payment",
        sub: "Preparing to send M-PESA prompt..."
      });
      
      const response = await payHeroService.initiateSTKPush({
        amount: parseInt(amount.replace(/[^0-9]/g, '')),
        currency: "KES",
        customerName: fullName,
        phoneNumber,
        provider: PAYMENT_PROVIDERS.MPESA
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to initiate payment');
      }

      // Use either reference or CheckoutRequestID as the transaction ID
      const txnId = response.reference || response.CheckoutRequestID;
      if (!txnId) {
        throw new Error('No reference or CheckoutRequestID returned from PayHero');
      }

      setTransactionId(txnId);
      setPaymentStatus('pending');
      
      // Set initial payment state
      setPaymentStatus('pending');
      setProgressMessage({
        main: "STK Push Sent",
        sub: "Please check your phone for the M-PESA prompt"
      });

      // Set up polling mechanism with delayed start to allow STK push to reach phone
      const maxAttempts = process.env.NODE_ENV === 'development' ? 60 : 20; // Longer polling for development
      let pollAttempts = 0;
      let errorCount = 0;
      const maxErrors = 3; // Number of consecutive errors before showing warning
      
      // Wait briefly before first status check to allow STK push to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Do first check immediately
      await checkPaymentStatus(txnId);
      
      // Set up polling with progressive intervals
      const startPolling = () => {
        // Clear any existing polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        
        // Use shorter polling interval in development
        const initialInterval = process.env.NODE_ENV === 'development' ? 2000 : 3000;

        const pollInterval = setInterval(async () => {
          pollAttempts++;
          
          try {
            await checkPaymentStatus(txnId);
            
            // After initial polling period, switch to slower polling
            if (pollAttempts === (process.env.NODE_ENV === 'development' ? 10 : 5)) {
              clearInterval(pollInterval);
              const newInterval = setInterval(async () => {
                pollAttempts++;
                await checkPaymentStatus(txnId);
                
                // Stop polling after max attempts
                if (pollAttempts >= maxAttempts) {
                  clearInterval(newInterval);
                  setPollingInterval(null);
                  if (paymentStatus === 'pending') {
                    const message = process.env.NODE_ENV === 'development' 
                      ? "Payment status check timed out. If testing, ensure the webhook endpoint is responding correctly."
                      : "If you've completed the payment but don't see your ticket, please contact support with your M-PESA message as reference.";
                    toast({
                      title: "Payment Status",
                      description: message,
                      duration: 10000
                    });
                  }
                }
              }, process.env.NODE_ENV === 'development' ? 5000 : 10000); // Shorter intervals in development
              setPollingInterval(newInterval);
            }
          } catch (pollError) {
            console.error('Error polling payment status:', pollError);
            errorCount++;
            
            // Show network warning after consecutive errors
            if (errorCount >= maxErrors) {
              toast({
                title: "Network Issues",
                description: "We're having trouble checking your payment. If you complete the M-PESA payment, don't worry - your ticket will be generated once we can connect again.",
                duration: 7000
              });
              errorCount = 0; // Reset counter after showing warning
            }
          }
        }, initialInterval); // Use configured initial interval
        
        setPollingInterval(pollInterval);
      };
      
      // Start the polling process
      startPolling();
      
      return { success: true, transactionId: txnId };
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment';
      setPaymentError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const processPayment = async (phoneNumber: string) => {
    setIsProcessing(true);
    let hasStartedPayment = false;
    
    try {
      // Update UI to show we're initiating
      setProgressMessage({
        main: "Initiating Payment",
        sub: "Preparing M-PESA request..."
      });
      
      const result = await initiatePayHeroPayment(phoneNumber);
      hasStartedPayment = result.success;
      
      if (result.success) {
        toast({
          title: "STK Push Sent!",
          description: "Please check your phone and enter your M-PESA PIN to complete the payment.",
        });
      } else {
        setPaymentStatus('failed');
        toast({
          title: "Payment Failed",
          description: result.error || "Failed to initiate payment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Only show error if we haven't started the payment process
      if (!hasStartedPayment) {
        setPaymentStatus('failed');
        toast({
          title: "Payment Failed",
          description: "Unable to initiate payment. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      // Only reset processing state if we haven't started payment
      if (!hasStartedPayment) {
        setIsProcessing(false);
      }
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const validation = payHeroService.validatePhoneNumber(phone);
    return validation.isValid ? validation.formattedNumber : null;
  };

  const handleMpesaPayment = async () => {
    if (!mpesaNumber || !email || !fullName) {
      toast({
        title: "Missing Information",
        description: "Please enter your full name, M-Pesa number and email address",
        variant: "destructive"
      });
      return;
    }

    // Validate and format phone number
    const validation = payHeroService.validatePhoneNumber(mpesaNumber);
    if (!validation.isValid) {
      toast({
        title: "Invalid Phone Number",
        description: validation.error || "Please enter a valid Kenyan phone number",
        variant: "destructive"
      });
      return;
    }

    await processPayment(validation.formattedNumber!);
  };

  const handleCardPayment = () => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name || !email || !fullName) {
      toast({
        title: "Missing Information", 
        description: "Please fill in all card details, full name and email address",
        variant: "destructive"
      });
      return;
    }
    
    // Card payment simulation (replace with actual card payment integration)
    setIsProcessing(true);
    setTimeout(() => {
      setPaymentStatus('success');
      generateTicketData();
      setIsProcessing(false);
      toast({
        title: "Payment Successful!",
        description: "Your card payment has been processed successfully.",
      });
    }, 2000);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="sm:max-w-md h-[90vh] overflow-y-auto" 
          aria-describedby="payment-dialog-description"
        >
          {(paymentStatus === 'pending' || paymentStatus === 'initiating') && progressMessage && (
            <div className="absolute inset-0 z-50">
              <ProgressOverlay
                loading={true}
                message={progressMessage.main}
                subMessage={progressMessage.sub}
                progress={progressValue}
                status={paymentStatus === 'success' ? 'success' : paymentStatus === 'failed' ? 'error' : 'pending'}
              />
            </div>
          )}
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold">Payment</DialogTitle>
            <p id="payment-dialog-description" className="text-sm text-muted-foreground">
              Complete your payment for the selected tickets
            </p>
          </DialogHeader>
          
          {/* Match Summary Card */}
          {ticketDetails.matchId && matchesData[ticketDetails.matchId as keyof typeof matchesData] && (
            <div className="bg-orange-500 text-white p-4 rounded-lg mb-4">
              {console.log('Match ID:', ticketDetails.matchId)}
              {console.log('Match Data:', matchesData[ticketDetails.matchId as keyof typeof matchesData])}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-4 rounded overflow-hidden border border-white/20">
                    <img 
                      src={matchesData[ticketDetails.matchId as keyof typeof matchesData].teamAFlag} 
                      alt={`${matchesData[ticketDetails.matchId as keyof typeof matchesData].teamA} Flag`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Error loading flag:', e.currentTarget.src);
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+';
                      }}
                    />
                  </div>
                  <span className="text-sm">{matchesData[ticketDetails.matchId as keyof typeof matchesData].teamACode}</span>
                </div>
                <span className="text-sm font-bold">{matchesData[ticketDetails.matchId as keyof typeof matchesData].time}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm">{matchesData[ticketDetails.matchId as keyof typeof matchesData].teamBCode}</span>
                  <div className="w-6 h-4 rounded overflow-hidden border border-white/20">
                    <img 
                      src={matchesData[ticketDetails.matchId as keyof typeof matchesData].teamBFlag} 
                      alt={`${matchesData[ticketDetails.matchId as keyof typeof matchesData].teamB} Flag`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Error loading flag:', e.currentTarget.src);
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+';
                      }}
                    />
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-center mb-1">
                {matchesData[ticketDetails.matchId as keyof typeof matchesData].teamA} VS {matchesData[ticketDetails.matchId as keyof typeof matchesData].teamB}
              </h3>
              <p className="text-center text-sm opacity-90">{matchesData[ticketDetails.matchId as keyof typeof matchesData].date}</p>
              <p className="text-center text-sm opacity-90">{matchesData[ticketDetails.matchId as keyof typeof matchesData].venue}</p>
            </div>
          )}

          {/* Your Seats */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Your Seats</h4>
            <div className="bg-muted p-3 rounded-lg">
              <span className="text-sm font-medium">#{Math.floor(Math.random() * 1000)}-Sec 17-Lower Row 10</span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">{ticketDetails.quantity} × {ticketDetails.type}</span>
                <span className="text-sm font-medium">{amount}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal</span>
                  <span className="text-sm">{amount}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{amount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Details */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Bio Details</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName" className="text-sm">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Payment method</h4>
            <Tabs defaultValue="mpesa" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="mpesa" className="h-10 bg-orange-500 text-white data-[state=active]:bg-orange-600">
                  M-PESA
                </TabsTrigger>
                <TabsTrigger value="card" className="h-10 bg-gray-200 text-gray-700 data-[state=active]:bg-gray-300">
                  Card
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="mpesa" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="mpesa-number" className="text-sm">M-Pesa Number *</Label>
                  <Input
                    id="mpesa-number"
                    placeholder="254XXXXXXXXX"
                    value={mpesaNumber}
                    onChange={(e) => setMpesaNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="space-y-4">
                <Button 
                  onClick={handleMpesaPayment}
                  disabled={isProcessing || paymentStatus === 'success'}
                  className="w-full bg-orange-500 hover:bg-orange-600 h-12"
                >
                  {paymentStatus === 'initiating' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initiating Payment...
                    </>
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending STK Push...
                    </>
                  ) : paymentStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Payment Successful!
                    </>
                  ) : paymentStatus === 'failed' ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  ) : (
                    `Pay ${amount} via M-Pesa`
                  )}
                </Button>
                  
                  {paymentStatus === 'success' && (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">Payment received successfully!</p>
                      </div>
                      <Button
                        onClick={() => setShowETicket(true)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        View E-Ticket
                      </Button>
                    </div>
                  )}

                  {paymentStatus === 'failed' && paymentError && (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">Verification Failed</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{paymentError}</p>
                      {/* Add manual verification option */}
                      <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-700 mb-2">
                          If you received an M-PESA confirmation message but don't see your ticket:
                        </p>
                        <Button
                          onClick={() => checkPaymentStatus(transactionId!)}
                          className="w-full bg-orange-500 hover:bg-orange-600"
                        >
                          Verify Payment Again
                        </Button>
                      </div>
                    </div>
                  )}

                  {transactionId && paymentStatus === 'pending' && (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-orange-600">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-medium text-center">
                          Please check your phone and enter your M-PESA PIN
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Waiting for payment confirmation...</span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="card" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="card-name" className="text-sm">Cardholder Name *</Label>
                  <Input
                    id="card-name"
                    placeholder="John Doe"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="card-number" className="text-sm">Card Number *</Label>
                  <Input
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="card-expiry" className="text-sm">Expiry *</Label>
                    <Input
                      id="card-expiry"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-cvv" className="text-sm">CVV *</Label>
                    <Input
                      id="card-cvv"
                      placeholder="123"
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleCardPayment}
                  disabled={isProcessing}
                  className="w-full bg-orange-500 hover:bg-orange-600 h-12"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    `Pay ${amount} via Card`
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* E-Ticket Modal */}
      {ticketData && (
        <ETicket
          isOpen={showETicket}
          onClose={() => setShowETicket(false)}
          ticketData={ticketData}
        />
      )}
    </>
  );
};

export default PaymentModal;