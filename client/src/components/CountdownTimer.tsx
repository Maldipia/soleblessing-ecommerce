import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endDate: Date | string;
  compact?: boolean;
}

export default function CountdownTimer({ endDate, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.expired) {
    return null;
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs ${isUrgent ? "text-red-500" : "text-orange-500"}`}>
        <Clock className="h-3 w-3" />
        <span className="font-semibold">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
      isUrgent ? "bg-red-500/10 border border-red-500/20" : "bg-orange-500/10 border border-orange-500/20"
    }`}>
      <Clock className={`h-4 w-4 ${isUrgent ? "text-red-500" : "text-orange-500"}`} />
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={isUrgent ? "text-red-500" : "text-orange-500"}>
          Sale ends in:
        </span>
        <div className="flex items-center gap-1">
          {timeLeft.days > 0 && (
            <>
              <span className={isUrgent ? "text-red-600" : "text-orange-600"}>
                {timeLeft.days}d
              </span>
              <span className="text-muted-foreground">:</span>
            </>
          )}
          <span className={isUrgent ? "text-red-600" : "text-orange-600"}>
            {String(timeLeft.hours).padStart(2, "0")}h
          </span>
          <span className="text-muted-foreground">:</span>
          <span className={isUrgent ? "text-red-600" : "text-orange-600"}>
            {String(timeLeft.minutes).padStart(2, "0")}m
          </span>
          <span className="text-muted-foreground">:</span>
          <span className={isUrgent ? "text-red-600" : "text-orange-600"}>
            {String(timeLeft.seconds).padStart(2, "0")}s
          </span>
        </div>
      </div>
    </div>
  );
}
