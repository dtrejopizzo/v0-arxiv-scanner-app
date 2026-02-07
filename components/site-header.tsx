"use client"

import { Clock, Calendar } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface SiteHeaderProps {
  selectedCategory: string | null
  categoryName: string | null
}

export function SiteHeader({ selectedCategory, categoryName }: SiteHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbPage>arXiv Scanner</BreadcrumbPage>
          </BreadcrumbItem>
          {selectedCategory && (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{categoryName || selectedCategory}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
        <div className="hidden items-center gap-1.5 sm:flex">
          <Calendar className="size-3" />
          <span>Updates: Mon-Thu 20:00 EST</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3" />
          <span>Cutoff: 14:00 EST</span>
        </div>
      </div>
    </header>
  )
}
