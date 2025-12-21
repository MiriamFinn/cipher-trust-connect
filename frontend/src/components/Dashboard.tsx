import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BorrowPanel from "./BorrowPanel";
import LendPanel from "./LendPanel";
import TransactionHistory from "./TransactionHistory";

const Dashboard = () => {
  return (
    <section id="dashboard" className="py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Privacy-First Lending
            </h2>
            <p className="text-lg text-muted-foreground">
              Your credit score remains encrypted throughout the entire process
            </p>
          </div>

          <Tabs defaultValue="borrow" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="borrow" className="text-base">Borrow</TabsTrigger>
              <TabsTrigger value="lend" className="text-base">Lend</TabsTrigger>
              <TabsTrigger value="history" className="text-base">History</TabsTrigger>
            </TabsList>

            <TabsContent value="borrow" className="mt-0">
              <BorrowPanel />
            </TabsContent>

            <TabsContent value="lend" className="mt-0">
              <LendPanel />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <TransactionHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;

