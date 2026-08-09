import { InputGroup, InputGroupAddon, InputGroupInput } from "@ui/input-group";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ui/breadcrumb";
import { Separator } from "@ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@ui/sidebar";
import { Search } from "lucide-react";
import { Kbd, KbdGroup } from "@ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/tooltip";
import { Outlet } from "react-router-dom";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex fixed w-full bg-accent shrink-0 items-center  mb-2 min-h-12 lg:max-w-svw transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center  px-4">
            <SidebarTrigger className="-ml-1 p-0" size="icon" />
            <Separator
              orientation="vertical"
              className="my-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb className="my-2">
              <BreadcrumbList className="shrink grow-0 flex-wrap max-w-xs">
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Build Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Tooltip>
            <TooltipTrigger
            className={"h-9 left-150 max-w-2/5 fixed transition-all duration-500 ease-linear"}
              render={
                <InputGroup className=" ml-auto  transition-all duration-500 ease-linear">
                  <InputGroupInput className="flex-1" placeholder="Search..." />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    12 results
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupAddon>
                      <Kbd>⌘ + ⇧ + K</Kbd>
                    </InputGroupAddon>
                  </InputGroupAddon>
                </InputGroup>
              }
            />
            <TooltipContent>
              <KbdGroup>
                <Kbd> Cmd/Ctrl </Kbd>+<Kbd> Shift </Kbd>+<Kbd>K</Kbd>
              </KbdGroup>
              to Focus Search Bar
            </TooltipContent>
          </Tooltip>
        </header>
        <section className="p-2 max-h-screen mt-12 max-w-[calc(100svw-18rem)] min-w-full overflow-clip">
          <Outlet />
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}
