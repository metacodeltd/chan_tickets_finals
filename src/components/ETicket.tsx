import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import chanLogo from "@/assets/chan.png";

interface ETicketProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: {
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
  };
}

const ETicket = ({ isOpen, onClose, ticketData }: ETicketProps) => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85, 180] // Ticket size dimensions
      });

      const margin = 5;
      const pageWidth = 85;
      const contentWidth = pageWidth - (margin * 2);

      // Set background color for header
      pdf.setFillColor(17, 24, 39); // Dark background
      pdf.rect(0, 0, pageWidth, 15, 'F');

      // Add mookh logo text
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(250, 204, 21); // Yellow color
      pdf.setFontSize(12);
      pdf.text("mookh.", margin, 10);

      // Add Ticket text in center
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.text("Ticket", pageWidth/2, 10, { align: 'center' });

      // Add CHAN logo on right
      const logoWidth = 8;
      pdf.addImage(chanLogo, 'PNG', pageWidth - margin - logoWidth, 4, logoWidth, logoWidth);

      // Header complete, now add main content with light background
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 15, pageWidth, 165, 'F');

      // Add CHAN 2024 title
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(8);
      pdf.text("CHAN 2024 FINALS", margin, 25);

      // Add match details
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      const matchText = `${ticketData.teamA} Vs ${ticketData.teamB}`;
      pdf.text(matchText, margin, 31);
      
      // Add kick-off time
      // pdf.setFontSize(7);
      // pdf.setTextColor(100);
      // pdf.text("Kick-off", pageWidth - 25, 25);
      // pdf.setTextColor(17, 24, 39);
      // pdf.setFontSize(10);
      // pdf.text(ticketData.matchTime, pageWidth - 25, 31);

      // // Add kick-off time with text label
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const kickoffX = pageWidth - margin - 20; // Adjusted position from right
      pdf.text("Kick-off", kickoffX, 30);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(14);
      pdf.text(ticketData.matchTime, kickoffX, 38);

      // Add venue
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text("VENUE", margin, 40);
      pdf.setTextColor(17, 24, 39);
      pdf.setFontSize(8);
      pdf.text(ticketData.venue, margin, 45);

      // Add ticket details in a grid
      const startY = 55;
      const colWidth = (pageWidth - (margin * 2)) / 3;
      
      // First row with proper spacing
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.text("TICKET TYPE", margin, startY);
      pdf.text("TICKET NO.", margin + colWidth, startY);
      pdf.text("Gates open", margin + (colWidth * 2), startY);

      pdf.setTextColor(0);
      pdf.setFontSize(8);
      pdf.text(ticketData.ticketType, margin, startY + 5);
      pdf.text("#" + ticketData.ticketId, margin + colWidth, startY + 5);
      pdf.text(ticketData.gateOpenTime, margin + (colWidth * 2), startY + 5);

      // Add attendee
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text("ATTENDEE", margin, startY + 25);
      pdf.setTextColor(0);
      pdf.setFontSize(12);
      pdf.text(ticketData.holderName, margin, startY + 31);

      // Add seat details with proper spacing
      const seatY = startY + 45;
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text("SEAT", margin, seatY);
      pdf.text("SECTION", margin + colWidth, seatY);
      pdf.text("ROW", margin + (colWidth * 2), seatY);

      pdf.setTextColor(0);
      pdf.setFontSize(10);
      pdf.text(ticketData.gate, margin, seatY + 6);
      const section = ticketData.section;
      pdf.setTextColor(0, 0, 255); // Blue color for section
      pdf.text(section, margin + colWidth, seatY + 6);
      pdf.setTextColor(0);
      pdf.text(ticketData.row, margin + (colWidth * 2), seatY + 6);

      // Generate QR code
      const qr = document.createElement('canvas');
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(qr, `https://mookh.ticket/v/${ticketData.ticketId}`, {
        width: 200,
        margin: 1
      });
      const qrImage = qr.toDataURL('image/png');

      // Add QR code centered
      const qrSize = 40;
      const qrX = (pageWidth - qrSize) / 2;
      pdf.addImage(qrImage, 'PNG', qrX, seatY + 15, qrSize, qrSize);
      
      // Add ticket ID under QR code
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text(ticketData.ticketId, pageWidth / 2, seatY + 60, { align: 'center' });

      pdf.save(`CHAN2024_Ticket_${ticketData.ticketId}.pdf`);

      toast({
        title: "Ticket Downloaded",
        description: "Your e-ticket has been downloaded as PDF successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSending(false);
    
    toast({
      title: "Ticket Sent",
      description: `E-ticket has been sent to ${ticketData.holderEmail}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="bg-[#111827] text-white py-3 px-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-yellow-400">mookh.</h2>
            <h3 className="text-lg font-semibold absolute left-1/2 -translate-x-1/2">Ticket</h3>
            <div className="flex items-center gap-1">
              <img src={chanLogo} alt="CHAN 2024" className="h-6 w-auto" />
            </div>
          </div>
        </div>
        
        <div id="ticket-content" className="bg-[#f8fafc] p-6 space-y-4">
          <div>
            <div className="space-y-1">
              <h2 className="text-base text-gray-900">CHAN 2024 FINALS</h2>
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">{ticketData.teamA} Vs {ticketData.teamB}</h3>
                <div className="text-right">
                  <p className="text-[0.8rem] text-gray-600 mb-0.5">Kick-off</p>
                  <p className="text-lg font-bold text-gray-900">{ticketData.matchTime}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 uppercase">Venue</p>
              <p className="text-base text-gray-900">{ticketData.venue}</p>
            </div>
            
            <div className="flex justify-between items-start border-t border-gray-200 pt-4">
              <div>
                <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Ticket Type</p>
                <p className="text-sm text-gray-900">{ticketData.ticketType}</p>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Ticket No.</p>
                <p className="text-sm text-gray-900">#{ticketData.ticketId}</p>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Gates open</p>
                <p className="text-sm text-gray-900">{ticketData.gateOpenTime}</p>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Attendee</p>
              <p className="text-base text-gray-900">{ticketData.holderName}</p>
            </div>
            
            <div className="flex justify-between items-start border-t border-gray-200 pt-4">
              <div>
                <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Seat</p>
                <p className="text-sm text-gray-900">{ticketData.gate}</p>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Section</p>
                <p className="text-sm text-gray-900">{ticketData.section}</p>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase text-gray-600 mb-1">Row</p>
                <p className="text-sm text-gray-900">{ticketData.row}</p>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col items-center justify-center py-4">
                <QRCodeSVG
                  value={`https://mookh.ticket/v/${ticketData.ticketId}`}
                  size={120}
                  level="H"
                  includeMargin={true}
                  className="mb-2"
                />
                <p className="text-[0.7rem] text-gray-600">{ticketData.ticketId}</p>
              </div>
            </div>
          </div>
          
          {/* <div className="text-center border-t border-gray-300 pt-4">
            <p className="text-xs text-gray-600">
              Show this ticket at the venue entrance
            </p>
          </div> */}
        </div>

        <div className="p-4 bg-white">
          <div className="flex gap-3">
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={isSending}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send to Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ETicket;