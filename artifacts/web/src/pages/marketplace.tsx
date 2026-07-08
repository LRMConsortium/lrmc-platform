import { AppLayout } from "@/components/layout/AppLayout"
import { useListMarketplaceListings, useListDigitalProducts, useGetCurrentUser } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatMoney, formatDate } from "@/lib/utils"
import { Store, Download } from "lucide-react"

export default function Marketplace() {
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground mt-1">Consortium general goods and digital assets.</p>
        </div>
        {!isAdmin && <Button>List Item</Button>}
      </div>

      <Tabs defaultValue="physical" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="physical">Physical Goods</TabsTrigger>
          <TabsTrigger value="digital">Digital Products</TabsTrigger>
        </TabsList>
        <TabsContent value="physical">
          <PhysicalGoodsList />
        </TabsContent>
        <TabsContent value="digital">
          <DigitalProductsList />
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}

function PhysicalGoodsList() {
  const { data: items, isLoading } = useListMarketplaceListings()
  const { data: user } = useGetCurrentUser()

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse"><div className="h-48 bg-muted rounded-xl"></div></div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items?.map(item => (
        <Card key={item.id} className="flex flex-col">
          <div className="h-32 bg-muted/30 flex items-center justify-center border-b">
            <Store className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <CardContent className="p-4 flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold line-clamp-1" title={item.title}>{item.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{item.description}</p>
            <div className="text-xl font-bold text-primary">{formatMoney(item.priceCents)}</div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            {item.sellerId !== user?.id ? (
               <Button className="w-full" size="sm">Contact Seller</Button>
            ) : (
              <Badge variant="outline" className="w-full justify-center py-1">Your Listing</Badge>
            )}
          </CardFooter>
        </Card>
      ))}
      {items?.length === 0 && <div className="col-span-full py-8 text-center text-muted-foreground">No items listed.</div>}
    </div>
  )
}

function DigitalProductsList() {
  const { data: products, isLoading } = useListDigitalProducts()

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse"><div className="h-48 bg-muted rounded-xl"></div></div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products?.map(p => (
        <Card key={p.id} className="flex flex-col border-primary/20">
          <CardContent className="p-6 flex-1">
            <Badge className="mb-4">{p.category}</Badge>
            <h3 className="font-serif font-bold text-xl mb-2">{p.title}</h3>
            <p className="text-sm text-muted-foreground mb-6 line-clamp-3">{p.description}</p>
            <div className="text-2xl font-bold">{formatMoney(p.priceCents)}</div>
          </CardContent>
          <CardFooter className="p-6 pt-0 bg-muted/10 border-t mt-auto">
            <Button className="w-full gap-2"><Download className="w-4 h-4"/> Purchase & Download</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
