import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TopBar from "@/components/TopBar";
import kenyaFlag from "@/assets/kenya.png";
import madagascarFlag from "@/assets/madagascar.png";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketType = "Ordinary", price = "KES 250", quantity = 1, matchId } = location.state || {};
  
  const [selectedPayment, setSelectedPayment] = useState("mpesa");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const simulateMpesaSTK = async () => {
    setIsProcessing(true);
    
    // Simulate M-Pesa STK push process
    toast({
      title: "M-Pesa Payment",
      description: "STK push sent to your phone. Please enter your PIN.",
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully.",
    });

    setTimeout(() => {
      navigate("/ticket", { 
        state: { 
          ticketType, 
          price,
          quantity,
          matchId,
          customerName: formData.name,
          customerEmail: formData.email,
          paymentMethod: selectedPayment
        } 
      });
    }, 1000);
  };

  const handlePayment = async () => {
    if (selectedPayment === "mpesa") {
      await simulateMpesaSTK();
    } else {
      // For card payments, go directly to ticket
      navigate("/ticket", { 
        state: { 
          ticketType, 
          price,
          quantity,
          matchId,
          customerName: formData.name,
          customerEmail: formData.email,
          paymentMethod: selectedPayment
        } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Match Info Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-4">
              <h2 className="font-bold text-center">PAMOJA</h2>
              <p className="text-center text-sm">together</p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded overflow-hidden border border-border">
                  <img src={kenyaFlag} alt="KE" className="w-full h-full object-cover" />
                </div>
                <span className="font-semibold">KEN</span>
              </div>
              <div className="text-center">
                <span className="text-sm bg-muted px-2 py-1 rounded">12:00</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">MAD</span>
                <div className="w-8 h-6 rounded overflow-hidden border border-border">
                  <img src={madagascarFlag} alt="MG" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Seats</span>
                <span>#36 - Sec 17-Lower Row 10</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>{quantity} × {ticketType}</span>
              <span>{price}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{price}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total</span>
              <span>{price}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bio Details Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Bio Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter your phone number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={selectedPayment === "mpesa" ? "default" : "outline"}
                className={`flex-1 ${selectedPayment === "mpesa" ? "bg-primary" : ""}`}
                onClick={() => setSelectedPayment("mpesa")}
              >
                M-PESA
              </Button>
              <Button
                variant={selectedPayment === "card" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setSelectedPayment("card")}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Proceed Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handlePayment}
          disabled={!formData.name || !formData.email || !formData.phone || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {selectedPayment === "mpesa" ? "Processing M-Pesa..." : "Processing..."}
            </>
          ) : (
            `Proceed to Payment`
          )}
        </Button>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">chan.mookh.com</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;