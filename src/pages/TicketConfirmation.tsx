import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import { ArrowLeft, Download, Mail, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TopBar from "@/components/TopBar";

const TicketConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    ticketType = "Ordinary", 
    customerName = "Curtis Karithi",
    customerEmail = "",
    quantity = 1,
    price = "KES 250",
    paymentMethod = "mpesa"
  } = location.state || {};
  
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    // Generate QR code
    const generateQR = async () => {
      try {
        const ticketData = {
          ticketNo: "#96B01605",
          match: "Kenya Vs Mauritania",
          venue: "Moi Sports Centre Kasarani",
          type: ticketType,
          attendee: customerName,
          quantity: quantity,
          price: price,
          section: "17-Lower",
          gate: "Gate 1",
          row: "10"
        };
        
        const qrString = JSON.stringify(ticketData);
        const url = await QRCode.toDataURL(qrString);
        setQrCodeUrl(url);
      } catch (err) {
        console.error("Failed to generate QR code:", err);
      }
    };

    generateQR();
  }, [ticketType, customerName, quantity, price]);

  const handleEmailTicket = () => {
    if (!customerEmail) {
      toast({
        title: "Email Required",
        description: "Please provide an email address to send the ticket.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Ticket Sent",
      description: `Ticket has been sent to ${customerEmail}`,
    });
  };

  const handleDownloadTicket = () => {
    // Create a simple ticket content for download
    const ticketContent = `
CHAN 2024 - Digital Ticket
========================
Match: Kenya vs Mauritania
Date: 3 Aug 2025, 15:00
Venue: Moi Sports Centre Kasarani
Ticket Type: ${ticketType}
Quantity: ${quantity}
Price: ${price}
Customer: ${customerName}
Payment: ${paymentMethod.toUpperCase()}
========================
`;

    const blob = new Blob([ticketContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CHAN-2024-Ticket-${customerName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your ticket is being downloaded.",
    });
  };

  const handleShareTicket = () => {
    if (navigator.share) {
      navigator.share({
        title: 'CHAN 2024 Ticket',
        text: `My ticket for Kenya vs Mauritania on 3 Aug 2025 at Moi Sports Centre Kasarani`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Ticket link copied to clipboard",
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
            onClick={() => navigate("/")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Ticket</h1>
        </div>

        {/* Success Message */}
        <div className="text-center mb-6">
          <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4">
            <p className="font-semibold">Payment Successful!</p>
            <p className="text-sm">Your ticket has been generated</p>
          </div>
        </div>

        {/* Ticket Card */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground text-center p-4">
            <div className="space-y-1">
              <h2 className="font-bold text-lg">mookh.</h2>
              <p className="text-sm opacity-90">TICKET</p>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4">
            {/* Match Details */}
            <div className="text-center border-b pb-4">
              <h3 className="font-bold text-lg mb-2">Kenya Vs Mauritania</h3>
              <p className="text-sm text-muted-foreground">3 Aug 2025, 15:00</p>
            </div>

            {/* Venue */}
            <div className="text-center border-b pb-4">
              <h4 className="font-semibold">VENUE</h4>
              <p className="text-sm">Moi Sports Centre Kasarani</p>
            </div>

            {/* Ticket Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">TICKET TYPE</p>
                <p className="font-semibold">{ticketType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">TICKET NO.</p>
                <p className="font-semibold">#96B01605</p>
              </div>
              <div>
                <p className="text-muted-foreground">QUANTITY</p>
                <p className="font-semibold">{quantity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PRICE</p>
                <p className="font-semibold">{price}</p>
              </div>
            </div>

            {/* Attendee */}
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-sm">ATTENDEE</p>
              <p className="font-bold text-lg">{customerName}</p>
            </div>

            {/* Seating Details */}
            <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
              <div>
                <p className="text-muted-foreground">SEAT</p>
                <p className="font-semibold">Gate 1</p>
              </div>
              <div>
                <p className="text-muted-foreground">SECTION</p>
                <p className="font-semibold">17-Lower</p>
              </div>
              <div>
                <p className="text-muted-foreground">ROW</p>
                <p className="font-semibold">10</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center border-t pt-4">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="Ticket QR Code" 
                  className="mx-auto w-32 h-32"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleEmailTicket}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button 
              onClick={handleDownloadTicket}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleShareTicket}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Ticket
          </Button>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-center mb-6">
          <p className="text-sm font-semibold">Ticket will be emailed for download</p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">chan.mookh.com</p>
        </div>
      </div>
    </div>
  );
};

export default TicketConfirmation;