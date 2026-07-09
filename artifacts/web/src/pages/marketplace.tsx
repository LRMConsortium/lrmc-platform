import { AppLayout } from "@/components/layout/AppLayout"
import { useListMarketplaceListings, useListDigitalProducts, useGetCurrentUser, useCreateDigitalProduct, getListDigitalProductsQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMoney, formatUSD, formatDate } from "@/lib/utils"
import { Store, Plus } from "lucide-react"
import { DigitalProductCheckoutDialog } from "@/components/DigitalProductCheckoutDialog"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

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

const DIGITAL_PRODUCT_CATEGORIES = [
  { value: "property-owner", label: "For Property Owners" },
  { value: "seller", label: "For Sellers" },
  { value: "buyer", label: "For Buyers" },
]

function DigitalProductsList() {
  const { data: products, isLoading } = useListDigitalProducts()
  const { data: user } = useGetCurrentUser()
  const isAdmin = user?.role === "admin"

  return (
    <div>
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <AddDigitalProductDialog />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse"><div className="h-48 bg-muted rounded-xl"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map(p => (
            <Card key={p.id} className="flex flex-col border-primary/20">
              <CardContent className="p-6 flex-1">
                <Badge className="mb-4">{p.category}</Badge>
                <h3 className="font-serif font-bold text-xl mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-3">{p.description}</p>
                <div className="text-2xl font-bold">{formatUSD(p.priceCents)}</div>
              </CardContent>
              <CardFooter className="p-6 pt-0 bg-muted/10 border-t mt-auto">
                <DigitalProductCheckoutDialog product={p} />
              </CardFooter>
            </Card>
          ))}
          {products?.length === 0 && <div className="col-span-full py-8 text-center text-muted-foreground">No digital products listed yet.</div>}
        </div>
      )}
    </div>
  )
}

function AddDigitalProductDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState(DIGITAL_PRODUCT_CATEGORIES[0].value)
  const [fileUrl, setFileUrl] = useState("")
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const createProduct = useCreateDigitalProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDigitalProductsQueryKey() })
        toast({ title: "Digital product added", description: `"${title}" is now live in the store, open to guests and members.` })
        setOpen(false)
        setTitle("")
        setDescription("")
        setPrice("")
        setCategory(DIGITAL_PRODUCT_CATEGORIES[0].value)
        setFileUrl("")
      },
      onError: () => {
        toast({ title: "Couldn't add product", description: "Please check the details and try again.", variant: "destructive" })
      },
    },
  })

  const priceCents = Math.round(parseFloat(price || "0") * 100)
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && priceCents > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Digital Product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Digital Product</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            createProduct.mutate({ data: { title, description, priceCents, category, fileUrl: fileUrl.trim() || undefined } })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dp-title">Title</Label>
            <Input id="dp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard Lease Agreement Template" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dp-description">Description</Label>
            <Textarea id="dp-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this document or guide, and who is it for?" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dp-price">Price (USD)</Label>
              <Input id="dp-price" type="number" min="1" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIGITAL_PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dp-file-url">Download link (PDF)</Label>
            <Input id="dp-file-url" type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://... link to the hosted file" />
            <p className="text-xs text-muted-foreground">Emailed to buyers automatically once payment succeeds. Host the file yourself (e.g. object storage, Drive) and paste the link here.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || createProduct.isPending} className="w-full">
              {createProduct.isPending ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
