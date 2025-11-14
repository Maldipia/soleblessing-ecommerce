import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Gift, Zap, Crown, TrendingUp, Calendar } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

const TIER_INFO = {
  bronze: {
    name: "Bronze",
    icon: Trophy,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    minPoints: 0,
    benefits: ["1 point per ₱100 spent", "Birthday bonus: 100 points"],
  },
  silver: {
    name: "Silver",
    icon: Gift,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    minPoints: 1000,
    benefits: [
      "1.5 points per ₱100 spent",
      "Birthday bonus: 200 points",
      "Early sale access (24 hours)",
    ],
  },
  gold: {
    name: "Gold",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    minPoints: 5000,
    benefits: [
      "2 points per ₱100 spent",
      "Birthday bonus: 500 points",
      "Early sale access (48 hours)",
      "Priority raffle entries",
    ],
  },
  platinum: {
    name: "Platinum",
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    minPoints: 10000,
    benefits: [
      "3 points per ₱100 spent",
      "Birthday bonus: 1000 points",
      "Early sale access (72 hours)",
      "VIP raffle entries",
      "Exclusive product access",
    ],
  },
};

export default function LoyaltyProgram() {
  const { user, loading } = useAuth();

  const { data: loyaltyData, isLoading: loadingPoints } = trpc.loyalty.getPoints.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: transactions, isLoading: loadingTransactions } =
    trpc.loyalty.getTransactions.useQuery(undefined, { enabled: !!user });

  if (loading || loadingPoints) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Trophy className="h-16 w-16 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-bold">Sign in to view your rewards</h2>
        <p className="text-muted-foreground">Earn points with every purchase</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
      </div>
    );
  }

  const currentTier = loyaltyData?.tier || "bronze";
  const currentPoints = loyaltyData?.points || 0;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];
  const TierIcon = tierInfo.icon;

  // Calculate next tier progress
  const tiers = Object.keys(TIER_INFO);
  const currentTierIndex = tiers.indexOf(currentTier);
  const nextTier = tiers[currentTierIndex + 1];
  const nextTierInfo = nextTier ? TIER_INFO[nextTier as keyof typeof TIER_INFO] : null;
  const progressToNextTier = nextTierInfo
    ? ((currentPoints - tierInfo.minPoints) / (nextTierInfo.minPoints - tierInfo.minPoints)) * 100
    : 100;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Loyalty Rewards Program</h1>

      {/* Current Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Your Rewards Status</CardTitle>
                <CardDescription>Earn points with every purchase</CardDescription>
              </div>
              <div className={`p-3 rounded-full ${tierInfo.bgColor}`}>
                <TierIcon className={`h-8 w-8 ${tierInfo.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Tier</span>
                  <Badge className={tierInfo.bgColor + " " + tierInfo.color}>
                    {tierInfo.name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold">{currentPoints.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
              </div>

              {nextTierInfo && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress to {nextTierInfo.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {nextTierInfo.minPoints - currentPoints} points to go
                    </span>
                  </div>
                  <Progress value={progressToNextTier} className="h-2" />
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Your Benefits:</h4>
                <ul className="space-y-1">
                  {tierInfo.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Earn Points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Make Purchases</p>
                <p className="text-xs text-muted-foreground">
                  Earn points based on your tier level
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Birthday Bonus</p>
                <p className="text-xs text-muted-foreground">
                  Get bonus points on your birthday
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Special Promotions</p>
                <p className="text-xs text-muted-foreground">
                  Bonus points during special events
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Tiers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tier Levels</CardTitle>
          <CardDescription>Unlock more benefits as you earn points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(TIER_INFO).map(([key, info]) => {
              const Icon = info.icon;
              const isCurrentTier = key === currentTier;
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${
                    isCurrentTier ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-full ${info.bgColor}`}>
                      <Icon className={`h-5 w-5 ${info.color}`} />
                    </div>
                    <div>
                      <h4 className="font-bold">{info.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {info.minPoints.toLocaleString()}+ pts
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {info.benefits.map((benefit, index) => (
                      <li key={index} className="text-xs flex items-start gap-1">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Points History</CardTitle>
          <CardDescription>Your recent points transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction: any) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`font-bold ${
                      transaction.points > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {transaction.points > 0 ? "+" : ""}
                    {transaction.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
