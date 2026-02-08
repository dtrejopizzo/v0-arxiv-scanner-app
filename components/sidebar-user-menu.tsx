"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "@/components/auth-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  LogIn,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SidebarUserMenu() {
  const { user, isAuthenticated, isLoading, logout, unreadNotifications } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<"login" | "register">("login")
  const { isMobile } = useSidebar()
  const router = useRouter()

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="size-8 rounded-lg bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-2 w-28 rounded bg-muted" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex gap-2 p-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setAuthTab("login")
                  setAuthOpen(true)
                }}
              >
                <LogIn className="mr-1.5 size-3.5" />
                Sign In
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setAuthTab("register")
                  setAuthOpen(true)
                }}
              >
                <Sparkles className="mr-1.5 size-3.5" />
                Sign Up
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
      </>
    )
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const planLabel =
    user.plan === "free"
      ? "Free"
      : user.plan === "starter"
        ? "Starter"
        : user.plan === "pro"
          ? "Pro"
          : user.plan === "edu"
            ? "EDU"
            : "Enterprise"

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                  <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  {unreadNotifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="size-5 rounded-full p-0 text-[10px] flex items-center justify-center"
                    >
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </Badge>
                  )}
                  <ChevronsUpDown className="ml-auto size-4" />
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                    <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.fullName}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2" onClick={() => router.push("/billing")}>
                  <Sparkles className="size-4" />
                  Plans & Billing
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {planLabel}
                  </Badge>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2" onClick={() => router.push("/account")}>
                  <BadgeCheck className="size-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => router.push("/notifications")}
                >
                  <Bell className="size-4" />
                  Notifications
                  {unreadNotifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto size-5 rounded-full p-0 text-[10px] flex items-center justify-center"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onClick={async () => {
                  await logout()
                  router.push("/")
                }}
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}
