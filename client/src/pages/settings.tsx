import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Lock,
  BellRing,
  CreditCard,
  Globe,
  Moon,
  Sun,
  PaintBucket
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// Profile form schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

// Password form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Notification settings schema
const notificationFormSchema = z.object({
  emailNotifications: z.boolean(),
  marketplaceUpdates: z.boolean(),
  inventoryAlerts: z.boolean(),
  salesNotifications: z.boolean(),
  marketingEmails: z.boolean(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");

  // Get current user
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      username: user?.username || "",
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification form
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      marketplaceUpdates: true,
      inventoryAlerts: true,
      salesNotifications: true,
      marketingEmails: false,
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      const response = await apiRequest("PATCH", "/api/users/current", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating your profile.",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordFormSchema>) => {
      const response = await apiRequest("PATCH", "/api/auth/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      passwordForm.reset();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating your password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationFormSchema>) => {
      const response = await apiRequest("PATCH", "/api/users/notifications", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating your notification settings.",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordFormSchema>) => {
    updatePasswordMutation.mutate(data);
  };

  const onNotificationSubmit = (data: z.infer<typeof notificationFormSchema>) => {
    updateNotificationsMutation.mutate(data);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account preferences and settings
        </p>
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
        {/* Sidebar / Tabs */}
        <aside className="lg:w-1/4">
          <Card>
            <CardContent className="p-4">
              <Tabs
                orientation="vertical"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full flex flex-col items-stretch h-auto bg-transparent space-y-1">
                  <TabsTrigger
                    value="profile"
                    className="justify-start text-left p-2.5"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="justify-start text-left p-2.5"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="justify-start text-left p-2.5"
                  >
                    <BellRing className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger
                    value="billing"
                    className="justify-start text-left p-2.5"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </TabsTrigger>
                  <TabsTrigger
                    value="appearance"
                    className="justify-start text-left p-2.5"
                  >
                    <PaintBucket className="h-4 w-4 mr-2" />
                    Appearance
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">Plan</h3>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-100">
                      {user?.subscription === "premium"
                        ? "Premium Plan"
                        : user?.subscription === "manager"
                        ? "Manager Plan"
                        : "Basic Plan"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Redirecting to billing",
                          description: "You'll be redirected to the billing page.",
                        });
                      }}
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {activeTab === "profile"
                  ? "Profile Settings"
                  : activeTab === "security"
                  ? "Security Settings"
                  : activeTab === "notifications"
                  ? "Notification Preferences"
                  : activeTab === "billing"
                  ? "Billing Information"
                  : "Appearance Settings"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-0">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Password must be at least 8 characters.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>

                <Separator className="my-8" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Coming soon",
                        description: "Two-factor authentication will be available soon.",
                      });
                    }}
                  >
                    Enable 2FA
                  </Button>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-0">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive email notifications for account updates
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="marketplaceUpdates"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <FormLabel className="text-base">Marketplace Updates</FormLabel>
                              <FormDescription>
                                Get notifications about your marketplace listings
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="inventoryAlerts"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <FormLabel className="text-base">Inventory Alerts</FormLabel>
                              <FormDescription>
                                Receive alerts about inventory levels and changes
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="salesNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <FormLabel className="text-base">Sales Notifications</FormLabel>
                              <FormDescription>
                                Get notified immediately when items are sold
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="marketingEmails"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <FormLabel className="text-base">Marketing Emails</FormLabel>
                              <FormDescription>
                                Receive tips, product updates and offers
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateNotificationsMutation.isPending}
                    >
                      {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Current Subscription</h3>
                    <div className="mt-3 p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {user?.subscription === "premium"
                              ? "Premium Plan"
                              : user?.subscription === "manager"
                              ? "Manager Plan"
                              : "Basic Plan"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {user?.subscription === "premium"
                              ? "$29.99/month"
                              : user?.subscription === "manager"
                              ? "$49.99/month"
                              : "$9.99/month"}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Payment Method</h3>
                    <div className="mt-3 p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 mr-3 text-gray-400" />
                          <div>
                            <p className="font-medium">Visa ending in 4242</p>
                            <p className="text-xs text-gray-500">Expires 04/2025</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Coming soon",
                              description: "Payment method management will be available soon.",
                            });
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Coming soon",
                            description: "Adding new payment methods will be available soon.",
                          });
                        }}
                      >
                        Add Payment Method
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Billing History</h3>
                    <div className="mt-3 text-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Receipt
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                May 15, 2023
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                Premium Plan - Monthly
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                $29.99
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                  Paid
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                Apr 15, 2023
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                Premium Plan - Monthly
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                $29.99
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                  Paid
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Theme</h3>
                    <p className="text-sm text-gray-500">
                      Choose your preferred display theme
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div
                        className={`border cursor-pointer rounded-md p-4 text-center ${
                          theme === "light" ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setTheme("light")}
                      >
                        <Sun className="mx-auto h-6 w-6 mb-2" />
                        <p className="text-sm font-medium">Light</p>
                      </div>
                      <div
                        className={`border cursor-pointer rounded-md p-4 text-center ${
                          theme === "dark" ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setTheme("dark")}
                      >
                        <Moon className="mx-auto h-6 w-6 mb-2" />
                        <p className="text-sm font-medium">Dark</p>
                      </div>
                      <div
                        className={`border cursor-pointer rounded-md p-4 text-center ${
                          theme === "system" ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => setTheme("system")}
                      >
                        <Globe className="mx-auto h-6 w-6 mb-2" />
                        <p className="text-sm font-medium">System</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium">Language</h3>
                    <p className="text-sm text-gray-500">
                      Select your preferred language
                    </p>
                    <div className="mt-4 max-w-xs">
                      <Select defaultValue="en">
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      toast({
                        title: "Settings saved",
                        description: "Your appearance settings have been saved.",
                      });
                    }}
                  >
                    Save Preferences
                  </Button>
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
