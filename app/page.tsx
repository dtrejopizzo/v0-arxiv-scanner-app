"use client"

import React from "react"

import { useState, useMemo } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Dashboard } from "@/components/dashboard"
import { ARXIV_CATEGORIES } from "@/lib/arxiv-categories"

export default function Page() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categoryName = useMemo(() => {
    if (!selectedCategory) return null
    for (const cat of ARXIV_CATEGORIES) {
      const sub = cat.subcategories.find((s) => s.code === selectedCategory)
      if (sub) return sub.name
    }
    return selectedCategory
  }, [selectedCategory])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "280px",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      <SidebarInset>
        <SiteHeader
          selectedCategory={selectedCategory}
          categoryName={categoryName}
        />
        <div className="flex flex-1 flex-col">
          <Dashboard selectedCategory={selectedCategory} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
