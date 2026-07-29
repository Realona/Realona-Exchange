import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAdminAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2, AlertTriangle, Info, Zap } from "lucide-react";
import { Link } from "wouter";

function priorityBadge(priority: string) {
  const s: Record<string, string> = {
    normal: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    important: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  const Icon = priority === "urgent" ? Zap : priority === "important" ? AlertTriangle : Info;
  return <Badge variant="outline" className={s[priority] ?? ""}><Icon className="w-3 h-3 mr-1 inline" />{priority}</Badge>;
}

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");

  const { data: announcements, isLoading } = useGetAdminAnnouncements();
  const create = useCreateAnnouncement();
  const remove = useDeleteAnnouncement();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["getAdminAnnouncements"] });

  const handleCreate = () => {
    if (!title.trim() || !description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" }); return;
    }
    create.mutate(
      { data: { title, description, priority: priority as import("@workspace/api-client-react").AnnouncementInputPriority } },
      {
        onSuccess: () => {
          toast({ title: "Announcement created!" });
          setTitle(""); setDescription(""); setPriority("normal");
          invalidate();
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    remove.mutate({ id }, {
      onSuccess: () => { toast({ title: "Announcement removed." }); invalidate(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-wrap gap-1 mb-6 border-b border-border pb-4">
          {["/admin", "/admin/users", "/admin/trades", "/admin/withdrawals", "/admin/deposits", "/admin/kyc-review", "/admin/announcements", "/admin/giveaways", "/admin/reports"].map((href) => (
            <Link key={href} href={href}>
              <Button variant="ghost" size="sm" className="h-7 text-xs capitalize">{href.split("/admin/")[1] ?? "Overview"}</Button>
            </Link>
          ))}
        </div>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Megaphone className="w-6 h-6 text-primary" />
          Announcements
        </h1>

        {/* Create form */}
        <Card className="border-border bg-card mb-8">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />New Announcement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Description (supports markdown or plain text)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} disabled={create.isPending} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />Publish Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : !announcements?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <Card key={a.id} className="border-border bg-card">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{a.title}</span>
                      {priorityBadge(a.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(a.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleDelete(a.id)} disabled={remove.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
