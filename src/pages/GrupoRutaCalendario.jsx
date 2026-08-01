import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { goBack } from '@/lib/navigation';
import { startOfWeek, addDays, addWeeks, addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, getISODay } from 'date-fns';
import { es } from 'date-fns/locale';

// weekday: 1=lunes..5=viernes, siempre con date-fns getISODay() — NUNCA getDay() nativo
// (domingo=0) — misma convención que usa close-route-group al crear los turnos iniciales.
const TIME_OF_DAY_LABELS = { manana: 'Mañana', tarde: 'Tarde' };

export default function GrupoRutaCalendario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [members, setMembers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [refDate, setRefDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [{ data: { user: authUser } }, { data: routeData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('school_routes').select('*').eq('id', id).maybeSingle(),
    ]);
    setUser(authUser);
    setRoute(routeData);

    const [membersRes, shiftsRes] = await Promise.all([
      supabase.from('school_route_members').select('*').eq('route_id', id).is('left_at', null),
      supabase.from('school_route_shifts').select('*').eq('route_id', id).order('weekday').order('time_of_day'),
    ]);
    setMembers(membersRes.data || []);
    setShifts(shiftsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // El autor no tiene fila propia en school_route_members, pero es un conductor válido.
  const driverOptions = useMemo(() => {
    const opts = members.map(m => ({ id: m.member_id, email: m.member_email, name: m.member_name || 'Miembro' }));
    if (route?.author_id) opts.unshift({ id: route.author_id, email: route.author_email, name: route.author_name || 'Autor' });
    return opts;
  }, [members, route]);

  const timeOfDaySlots = useMemo(() => [...new Set(shifts.map(s => s.time_of_day))].sort(), [shifts]);

  const handleAssignDriver = async (shift, driverId) => {
    const driver = driverOptions.find(d => d.id === driverId) || null;
    const patch = {
      driver_member_id: driver?.id || null,
      driver_email: driver?.email || null,
      driver_name: driver?.name || null,
    };
    const { error } = await supabase.from('school_route_shifts').update(patch).eq('id', shift.id);
    if (!error) {
      setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, ...patch } : s));
    }
  };

  const handleAddTimeOfDay = async (timeOfDay) => {
    const rows = [1, 2, 3, 4, 5].map(weekday => ({ route_id: Number(id), weekday, time_of_day: timeOfDay, driver_member_id: null }));
    const { data, error } = await supabase.from('school_route_shifts').insert(rows).select();
    if (!error) setShifts(prev => [...prev, ...(data || [])]);
  };

  // El autor no tiene fila propia en school_route_members, así que leave-route-group
  // (que busca la membresía por member_id) no aplica a su caso — solo se ofrece a miembros.
  const isMember = !!user && members.some(m => m.member_id === user.id);

  const handleLeaveGroup = async () => {
    if (!window.confirm('¿Salir de este grupo de ruta? Dejarás de ver el chat y el calendario de turnos.')) return;
    setLeaving(true);
    const { data, error } = await supabase.functions.invoke('leave-route-group', { body: { route_id: Number(id) } });
    setLeaving(false);

    if (error || data?.error) {
      alert(data?.error || 'No se ha podido salir del grupo.');
      return;
    }
    navigate('/mis-rutas');
  };

  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekDays = [1, 2, 3, 4, 5].map(weekday => addDays(weekStart, weekday - 1));

  const monthDays = eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) })
    .filter(d => getISODay(d) <= 5);

  if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Cargando...</div>;
  if (!route) return <div className="p-20 text-center text-muted-foreground">Esta ruta no existe.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20 mt-6 animate-in fade-in duration-300">
      <button onClick={() => goBack(navigate, '/servicios')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      <div className="mb-6">
        <h1 className="font-cormorant text-3xl font-semibold text-foreground">Calendario de turnos</h1>
        <p className="text-sm text-muted-foreground">{route.school_name} — {route.location}</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-2xl">
          <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${viewMode === 'week' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Semana</button>
          <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${viewMode === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Mes</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRefDate(prev => viewMode === 'week' ? addWeeks(prev, -1) : addMonths(prev, -1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground capitalize">
            {viewMode === 'week' ? `Semana del ${format(weekStart, 'd MMM', { locale: es })}` : format(refDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setRefDate(prev => viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <div className="space-y-6">
          {timeOfDaySlots.map(timeOfDay => (
            <div key={timeOfDay}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{TIME_OF_DAY_LABELS[timeOfDay] || timeOfDay}</h2>
              <div className="grid grid-cols-5 gap-2">
                {weekDays.map((day, idx) => {
                  const weekday = idx + 1;
                  const shift = shifts.find(s => s.weekday === weekday && s.time_of_day === timeOfDay);
                  return (
                    <div key={weekday} className="bg-card border border-border rounded-xl p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE d', { locale: es })}</p>
                      {shift ? (
                        <select
                          value={shift.driver_member_id || ''}
                          onChange={e => handleAssignDriver(shift, e.target.value || null)}
                          className="w-full mt-1 bg-muted/50 rounded-lg px-1 py-1 text-[10px] focus:outline-none"
                        >
                          <option value="">Sin asignar</option>
                          {driverOptions.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 mt-1">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            {!timeOfDaySlots.includes('manana') && (
              <button onClick={() => handleAddTimeOfDay('manana')} className="flex-1 py-2 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                + Añadir turno de mañana
              </button>
            )}
            {!timeOfDaySlots.includes('tarde') && (
              <button onClick={() => handleAddTimeOfDay('tarde')} className="flex-1 py-2 rounded-xl text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                + Añadir turno de tarde
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">Resumen del mes — punto relleno = turno con conductor asignado.</p>
          <div className="grid grid-cols-5 gap-2">
            {monthDays.map(day => {
              const weekday = getISODay(day);
              const dayShifts = shifts.filter(s => s.weekday === weekday);
              return (
                <div key={day.toISOString()} className="bg-card border border-border rounded-xl p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{format(day, 'd')}</p>
                  <div className="flex justify-center gap-1 mt-1">
                    {dayShifts.map(s => (
                      <span
                        key={s.id}
                        className={`w-1.5 h-1.5 rounded-full ${s.driver_member_id ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        title={TIME_OF_DAY_LABELS[s.time_of_day] || s.time_of_day}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMember && (
        <button
          onClick={handleLeaveGroup}
          disabled={leaving}
          className="w-full flex items-center justify-center gap-1.5 mt-8 py-3 rounded-2xl text-sm font-medium border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" /> {leaving ? 'Saliendo...' : 'Salir del grupo'}
        </button>
      )}
    </div>
  );
}
