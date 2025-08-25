import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import PaymentModal from "@/components/PaymentModal";

const TicketSelection = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<{
    type: string;
    basePrice: number;
    totalAmount: string;
  } | null>(null);

  // Match data
  const matches = {
    "1": {
      homeTeam: "TBD",
      awayTeam: "TBD",
      venue: "Moi Sports Centre Kasarani",
      tickets: [
        {
          type: "Regular",
          basePrice: 100,
          price: "KES 100",
          description: "Gates open 15:00 hrs",
          available: true
        },
        {
          type: "VIP",
          basePrice: 300,
          price: "KES 300",
          description: "Gates open 15:00 hrs, VIP seating",
          available: true
        }
      ]
    },
    "2": {
      homeTeam: "TZ",
      awayTeam: "MAR",
      venue: "Benjamin Mkapa National Stadium",
      tickets: [
        {
          type: "Regular",
          basePrice: 50,
          price: "KES 50",
          description: "Gates open 15:00 hrs",
          available: true
        },
        {
          type: "VIP",
          basePrice: 130,
          price: "KES 130",
          description: "Gates open 15:00 hrs, VIP seating",
          available: true
        }
      ]
    }
  };

  const currentMatch = matches[matchId as keyof typeof matches];
  const [matchDetails, setMatchDetails] = useState(currentMatch);

  useEffect(() => {
    if (!currentMatch) {
      // If invalid match ID, redirect to home
      navigate('/');
    }
    setMatchDetails(currentMatch);
  }, [currentMatch, navigate]);

  const ticketTypes = matchDetails?.tickets || [];

  const handleGetTicket = (ticketType: string, basePrice: number) => {
    setSelectedTicket({
      type: ticketType,
      basePrice,
      totalAmount: `KES ${basePrice}`
    });
    setPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="max-w-md mx-auto px-2 py-4">
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
          <div>
            <h1 className="text-lg font-semibold">Available tickets</h1>
            {matchDetails && (
              <p className="text-sm text-muted-foreground">
                {matchDetails.homeTeam} vs {matchDetails.awayTeam} - {matchDetails.venue}
              </p>
            )}
          </div>
        </div>

        {/* Ticket Limit Notice */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md w-full">
              Note: Limited to 1 ticket per person for this event
            </p>
          </div>
        </div>

        {/* Ticket Types */}
        <div className="space-y-4">
          {ticketTypes.map((ticket) => (
            <Card key={ticket.type} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{ticket.type}</h3>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{ticket.price}</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleGetTicket(ticket.type, ticket.basePrice)}
                >
                  Get Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">chan.mookah.com</p>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedTicket && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          amount={selectedTicket.totalAmount}
          ticketDetails={{
            type: selectedTicket.type,
            quantity: 1,
            matchId: matchId || "1"
          }}
        />
      )}
    </div>
  );
};

export default TicketSelection;