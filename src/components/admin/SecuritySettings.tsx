import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export function SecuritySettings() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({
    enable_rate_limit_declarations: true,
    rate_limit_declarations: '5/m',
    enable_captcha_declarations: true,
    enable_rate_limit_attachments: true,
    enable_captcha_clues: false,
    ip_blacklist: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/protection/');
      setSettings(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = await api.put('/api/admin/protection/', settings);
      setSettings(data);
      toast({ title: 'Paramètres sauvegardés' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Protection & Sécurité</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 items-center gap-2">
            <Label>Rate-limit déclarations</Label>
            <div className="flex items-center gap-2">
              <Switch checked={settings.enable_rate_limit_declarations} onCheckedChange={(v:any) => setSettings({...settings, enable_rate_limit_declarations: v})} />
              <Input value={settings.rate_limit_declarations || ''} onChange={(e) => setSettings({...settings, rate_limit_declarations: e.target.value})} className="w-36" />
            </div>
          </div>

          <div className="grid grid-cols-2 items-center gap-2">
            <Label>CAPTCHA déclarations</Label>
            <Switch checked={settings.enable_captcha_declarations} onCheckedChange={(v:any) => setSettings({...settings, enable_captcha_declarations: v})} />
          </div>

          <div className="grid grid-cols-2 items-center gap-2">
            <Label>Rate-limit attachments</Label>
            <Switch checked={settings.enable_rate_limit_attachments} onCheckedChange={(v:any) => setSettings({...settings, enable_rate_limit_attachments: v})} />
          </div>

          <div className="grid grid-cols-2 items-start gap-2">
            <Label>CAPTCHA indices (clues)</Label>
            <Switch checked={settings.enable_captcha_clues} onCheckedChange={(v:any) => setSettings({...settings, enable_captcha_clues: v})} />
          </div>

          <div>
            <Label>IP Blacklist (une IP par ligne)</Label>
            <Textarea value={settings.ip_blacklist || ''} onChange={(e:any) => setSettings({...settings, ip_blacklist: e.target.value})} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>Enregistrer</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
