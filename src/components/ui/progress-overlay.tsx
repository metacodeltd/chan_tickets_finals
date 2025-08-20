import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, ArrowRight, Loader2, PhoneCall, CheckCircle2 } from "lucide-react"

interface ProgressOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  subMessage?: string
  loading?: boolean
  progress?: number
  status?: 'pending' | 'processing' | 'success' | 'error'
}

const ProgressOverlay = React.forwardRef<HTMLDivElement, ProgressOverlayProps>(
  ({ message, subMessage, loading = true, progress, status = 'pending', className, ...props }, ref) => {
    if (!loading) return null

    const getIcon = () => {
      switch(status) {
        case 'success':
          return <CheckCircle2 className="h-8 w-8 text-green-500" />
        case 'error':
          return <AlertCircle className="h-8 w-8 text-red-500" />
        default:
          return <PhoneCall className="h-8 w-8 text-orange-500" />
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "absolute inset-0 z-50 bg-black/30 backdrop-blur-[2px]",
          "flex flex-col items-center justify-center",
          "transition-all duration-200 ease-in-out",
          className
        )}
        {...props}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-lg p-6 w-[90%] max-w-[320px] mx-auto shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            {getIcon()}
            <div className="flex-1 min-w-0">
              {message && (
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {message}
                </h3>
              )}
              {subMessage && (
                <p className="text-sm text-muted-foreground">
                  {subMessage}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-orange-100 text-orange-500">
                    {status === 'success' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-orange-500">
                    {Math.round(progress || 0)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-orange-100">
                <div
                  className={cn(
                    "transition-all duration-300 ease-out shadow-none",
                    "flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500",
                    progress === 0 ? "w-0" :
                    progress <= 25 ? "w-1/4" :
                    progress <= 50 ? "w-1/2" :
                    progress <= 75 ? "w-3/4" :
                    "w-full"
                  )}
                />
              </div>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Checking Payment Status</span>
              </div>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    )
  }
)
ProgressOverlay.displayName = "ProgressOverlay"

export { ProgressOverlay }
