import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Calendar, Clock } from "lucide-react";
import TopBar from "@/components/TopBar";
import heroImage from "@/assets/newBanner.png";
import chanLogo from "@/assets/chann.png";
import kenyaFlag from "@/assets/kenya.png";
import madagascarFlag from "@/assets/madagascar.png";
import tzFlag from "@/assets/tz.png";
import marFlag from "@/assets/mar.png";
const Index = () => {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const upcomingMatches = [
    {
      id: "1",
      date: "Sat 30 Aug 2025",
      homeTeam: "TBD",
      awayTeam: "TBD",
      homeFlag: kenyaFlag,
      awayFlag: kenyaFlag,
      time: "18:00",
      venue: "Moi Sports Centre Kasarani",
      price: 150
    },
    // {
    //   id: "2",
    //   date: "22 Aug 2025",
    //   homeTeam: "TAN",
    //   awayTeam: "MOR",
    //   homeFlag: tzFlag,
    //   awayFlag: marFlag,
    //   time: "20:00",
    //   venue: "Benjamin Mkapa National Stadium",
    //   price: 50
    // },
  ];

  const handleMatchSelect = (matchId: string) => {
    navigate(`/tickets/${matchId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Hero Section */}
      <div className="hidden lg:block relative">
        <div 
          className="h-[65vh] bg-cover bg-center relative"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          {/* Desktop TopBar */}
          <div className="absolute top-0 left-0 right-0 z-10">
            <TopBar />
          </div>
          
          {/* CHAN Logo
          <div className="absolute top-6 left-6 z-10">
            <img src={chanLogo} alt="CHAN Logo" className="w-16 h-16" />
          </div> */}
        </div>
      </div>

      {/* Search Form - Between Hero and Matches */}
      <div className="hidden lg:block -mt-10 relative z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Card className="bg-card/95 backdrop-blur-sm border-4">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search Team</label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kenya">Kenya</SelectItem>
                      <SelectItem value="madagascar">Madagascar</SelectItem>
                      <SelectItem value="tanzania">Tanzania</SelectItem>
                      <SelectItem value="morocco">Morocco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kasarani">Moi Sports Centre Kasarani</SelectItem>
                      <SelectItem value="mkapa">Benjamin Mkapa National Stadium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white">
                    <Search className="w-4 h-4 mr-2" />
                    Find Matches
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

     {/* Mobile Layout */}
<div className="lg:hidden">
  <TopBar />
  
  {/* Mobile Hero with Banner */}
  <div className="w-full relative">
    <img 
      src={heroImage} 
      alt="Hero Banner" 
      className="w-full h-auto"   // ✅ no stretching
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
  </div>

  {/* Mobile Search Form */}
  <div className="max-w-md mx-auto px-4 -mt-6 relative z-10">
    <Card className="shadow-lg">
      <CardContent className="space-y-3 px-4 pb-4 pt-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Search Team</label>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kenya">Kenya</SelectItem>
              <SelectItem value="madagascar">Madagascar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Location</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kasarani">Moi Sports Centre Kasarani</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full bg-[#E76222] hover:bg-[#E76222]/90 text-white">
          <Search className="w-4 h-4 mr-2" />
          Find Matches
        </Button>
      </CardContent>
    </Card>
  </div>
</div>


      {/* Upcoming Matches Section - Both Desktop and Mobile */}
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-16">
        <h2 className="text-2xl font-bold mb-8 text-start lg:text-left">CHAN FINALS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingMatches.map((match) => (
            <Card 
              key={match.id} 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 group overflow-hidden"
              onClick={() => handleMatchSelect(match.id)}
            >
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-card to-muted p-6 space-y-4">
                  
                  <div className="text-center text-2xl font-bold text-foreground">
                    {match.date}
                  </div>
                  
                  {/* Horizontal dark line */}
                  <div className="border-t border-foreground/20 my-4"></div>
                  
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="text-xl font-bold text-foreground">{match.homeTeam}</div>
                    
                    {/* Home Flag */}
                    <div className="w-12 h-8 rounded overflow-hidden border-2 border-yellow-400">
                      <img src={match.homeFlag} alt={`${match.homeTeam} Flag`} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Time */}
                    <div className="bg-foreground/10 backdrop-blur-sm rounded-lg px-4 py-2 font-bold text-xl text-foreground">
                      {match.time}
                    </div>
                    
                    {/* Away Flag */}
                    <div className="w-12 h-8 rounded overflow-hidden border-2 border-gray-300">
                      <img src={match.awayFlag} alt={`${match.awayTeam} Flag`} className="w-full h-full object-cover" />
                    </div>
                    {/* Away Team */}
                    <div className="text-xl font-bold text-foreground">{match.awayTeam}</div>
                  </div>
                  
                  <div className="text-center text-foreground font-medium">
                    {match.venue}
                  </div>
                </div>
                
                <div className="bg-white p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">from Ksh {match.price}</span>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2 rounded-full"
                    >
                      Buy Tickets
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <p className="text-sm text-muted-foreground mb-2">hello@mookah.africa</p>
              <p className="text-sm text-muted-foreground">+254 708 98 4579</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Socials</h3>
              <p className="text-sm text-muted-foreground mb-2">Instagram</p>
              <p className="text-sm text-muted-foreground">Facebook</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <p className="text-sm text-muted-foreground mb-2">Privacy Policy</p>
              <p className="text-sm text-muted-foreground">Terms of Service</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-xs text-muted-foreground">chan.mookah.com</p>
            <p className="text-xs text-muted-foreground mt-1">Powered by Mookah Labs</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
