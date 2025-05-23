import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInventory } from '@/hooks/use-inventory';
import { useMarketplaces } from '@/hooks/use-marketplaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  condition: z.string().min(1, 'Condition is required'),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
  marketplaceId: z.number().optional()
});

type ProductForm = z.infer<typeof productSchema>;

export default function NewProduct() {
  const [, navigate] = useLocation();
  const { createInventoryItem } = useInventory();
  const { marketplaces, createMarketplaceListing } = useMarketplaces();

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'General',
      condition: 'Good',
      price: 0,
      quantity: 1
    }
  });

  const [publishing, setPublishing] = useState(false);

  const onSubmit = (data: ProductForm) => {
    const itemData = {
      sku: `SKU-${Date.now()}`,
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      price: data.price,
      quantity: data.quantity,
      status: 'draft'
    };

    createInventoryItem.mutate(itemData, {
      onSuccess: (item) => {
        if (data.marketplaceId) {
          setPublishing(true);
          createMarketplaceListing.mutate({
            marketplaceId: data.marketplaceId,
            inventoryItemId: item.id
          }, {
            onSettled: () => {
              setPublishing(false);
              navigate('/inventory');
            }
          });
        } else {
          navigate('/inventory');
        }
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Product title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the product" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Category" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Good" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {marketplaces && marketplaces.length > 0 && (
                <FormField
                  control={form.control}
                  name="marketplaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish to Marketplace</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Do not publish" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Do not publish</SelectItem>
                          {marketplaces.map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" disabled={createInventoryItem.isPending || publishing}>
                {publishing ? 'Publishing...' : 'Create Product'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

