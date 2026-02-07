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
import { isMedRxivCategory } from "@/lib/arxiv-categories"

interface SiteHeaderProps {
  selectedCategory: string | null
  categoryName: string | null
}

export function SiteHeader({ selectedCategory, categoryName }: SiteHeaderProps) {
  const isMedrxiv = selectedCategory ? isMedRxivCategory(selectedCategory) : false

  return (
    <header className="bg-background sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbPage>{isMedrxiv ? "medRxiv Scanner" : "arXiv Scanner"}</BreadcrumbPage>
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
        {!isMedrxiv && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Calendar className="size-3" />
            <span>Updates: Mon-Thu 20:00 EST</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="size-3" />
          <span>{isMedrxiv ? "medRxiv preprints" : "Cutoff: 14:00 EST"}</span>
        </div>
      </div>
    </header>
  )
}
