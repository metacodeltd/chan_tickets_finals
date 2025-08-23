import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import chanLogo from "@/assets/chann.png";

const TopBar = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-full bg-[#FA5501] p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className=" rounded-lg p-2">
          <img src={chanLogo} alt="CHAN 2024" className="h-6 w-auto" />
        </div>
      
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-primary-foreground hover:bg-primary-foreground/20"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
};

export default TopBar;