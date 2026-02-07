"use client"

import React from "react"

import {
  Monitor,
  TrendingUp,
  Zap,
  Sigma,
  Star,
  Atom,
  Orbit,
  Waves,
  CircleDot,
  FlaskConical,
  Dna,
  DollarSign,
  BarChart3,
  ChevronRight,
  Search,
  BookOpen,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"

const iconMap: Record<string, LucideIcon> = {
  Monitor,
  TrendingUp,
  Zap,
  Sigma,
  Star,
  Atom,
  Orbit,
  Waves,
  CircleDot,
  FlaskConical,
  Dna,
  DollarSign,
  BarChart3,
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedCategory: string | null
  onSelectCategory: (code: string) => void
}

export function AppSidebar({ selectedCategory, onSelectCategory, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">arXiv Scanner</span>
            <span className="text-xs text-sidebar-foreground/60">SOTA Paper Tracker</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Search className="mr-1 size-3" />
            Categories
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ARXIV_CATEGORIES.map((cat) => {
                const Icon = iconMap[cat.icon] || Monitor
                return (
                  <Collapsible key={cat.code} asChild>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={cat.name}>
                          <Icon className="size-4" />
                          <span>{cat.name}</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {cat.subcategories.map((sub) => (
                            <SidebarMenuSubItem key={sub.code}>
                              <SidebarMenuSubButton
                                isActive={selectedCategory === sub.code}
                                onClick={() => onSelectCategory(sub.code)}
                              >
                                <span className="font-mono text-[10px] text-muted-foreground">{sub.code}</span>
                                <span className="truncate">{sub.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
