import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import InvoicesPage from "@/pages/invoices";
import EditInvoicePage from "@/pages/edit-invoice";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/invoices/edit/:id" component={EditInvoicePage} />
      <Route path="/invoice/:id" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
