import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'

// Define the blueprint structure for the component props
interface ClientViewProps {
  session: Session
}

// Define the shape of a record inside the 'barbers' PostgreSQL catalog table
interface Barber {
  id: number | string
  name: string
  specialty: string
}

// Define the shape of a nested relation mapping the professional identifier name
interface NestedBarberName {
  name: string
}

// Define the shape of a record inside the 'appointments' core table mapping database joins
interface Appointment {
  id: number
  appointment_date: string
  appointment_time: string
  status: string
  barbers: NestedBarberName | null
}

export default function ClientView({ session }: ClientViewProps) {
  // Strong-state management enforcing specific database object shapes
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]) 
  const [selectedBarber, setSelectedBarber] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Reusable visual layout engine ensuring design integrity
  const centralizedInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    boxSizing: 'border-box', 
    display: 'block' 
  }

  // Orchestrate network trace fetching vectors to sync data catalogs down from the cloud
  const fetchData = async (): Promise<void> => {
    try {
      // 1. Fetch available barbers mapping global schema definitions
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
      
      if (barbersError) throw barbersError
      setBarbers((barbersData as Barber[]) || [])

      // 2. Query relational appointment tables limiting visibility scope down to the active row session context
      const { data: apptsData, error: apptsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          barbers (name)
        `)
        .eq('client_id', session.user.id) 
        .order('appointment_date', { ascending: true })

      if (apptsError) throw apptsError
      setMyAppointments((apptsData as unknown as Appointment[]) || [])
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error loading data:', error.message)
      } else {
        console.error('An unexpected relational query fault occurred.')
      }
      setErrorMessage('An error occurred while fetching information.')
    }
  }

  useEffect(() => {
    fetchData()
  }, [session])
  
  // Intercept and isolate UI submission pipelines
  const handleReserve = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const currentUserId: string = session?.user?.id || (await supabase.auth.getUser()).data.user?.id || '';

      if (!currentUserId) {
        throw new Error('User session not found. Please sign in again.');
      }

      if (!selectedBarber) {
        throw new Error('Please select a barber.');
      }

      let formattedDate: string = date;
      let formattedTime: string = time;

      // Timing validation rule block verifying standard hour increments boundary alignments
      if (formattedTime) {
        const timeParts: string[] = formattedTime.split(':');
        const minutes: string = timeParts[1];
        
        if (minutes !== '00') {
          throw new Error('Appointments can only be booked exactly at the top of the hour (e.g., 1:00, 2:00). Minutes are invalid.');
        }
      }

      if (formattedTime && formattedTime.split(':').length === 2) {
        formattedTime = `${formattedTime}:00`;
      }

      const finalBarberId: number | string = isNaN(Number(selectedBarber)) ? selectedBarber : Number(selectedBarber);

      // Submit sanitized payload metrics into the serverless backend
      const { error: insertError } = await supabase
        .from('appointments')
        .insert([
          {
            client_id: currentUserId,
            barber_id: finalBarberId, 
            appointment_date: formattedDate, 
            appointment_time: formattedTime, 
            status: 'pending'
          }
        ]);

      if (insertError) {
        // Intercept PostgreSQL unique index errors (Constraint Code 23505) and resolve collisions gracefully
        if (insertError.code === '23505') {
          throw new Error('This specific hour slot is already booked for this barber. Please select another time.');
        }
        throw insertError;
      }

      setSuccessMessage('Your appointment has been successfully scheduled!')
      setSelectedBarber('')
      setDate('')
      setTime('')
      
      await fetchData()
    } catch (error) {
      if (error instanceof Error) {
        console.error('Database rejection payload:', error.message);
        setErrorMessage(error.message);
      } else {
        console.error('An unmapped transport fault occurred.');
        setErrorMessage('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '650px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', position: 'relative', boxSizing: 'border-box' }}>
      <button 
        onClick={async () => await supabase.auth.signOut()} 
        style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
      >
        Sign Out
      </button>

      <h2 style={{ paddingTop: '20px' }}>Book Your Service at ChopTime</h2>
      
      {errorMessage && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>⚠️ {errorMessage}</div>}
      {successMessage && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#d1e7dd', color: '#0f5132', borderRadius: '4px' }}>✅ {successMessage}</div>}

      <form onSubmit={handleReserve}>
        <div style={{ marginBottom: '15px' }}>
          <label>Select Your Barber:</label>
          <select value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)} required style={centralizedInputStyle}>
            <option value="">-- Select a professional --</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name} - {b.specialty}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Date:</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={centralizedInputStyle} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Time:</label>
          <input 
            type="time" 
            value={time} 
            onChange={(e) => setTime(e.target.value)} 
            required 
            step="3600" 
            style={centralizedInputStyle} 
          />
        </div>
        <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '10px', backgroundColor: isSubmitting ? '#ccc' : '#222', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxSizing: 'border-box', display: 'block' }}>
          {isSubmitting ? 'Checking availability...' : 'Confirm Booking'}
        </button>
      </form>

      <h3 style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>My Bookings</h3>
      <ul style={{ padding: '0', margin: '0', listStyle: 'none', width: '100%', boxSizing: 'border-box' }}>
        {myAppointments.length === 0 ? (
          <li style={{ color: '#777', fontStyle: 'italic', padding: '10px 0' }}>No appointments registered yet.</li>
        ) : (
          myAppointments.map((appt) => (
            <li 
              key={appt.id} 
              style={{ 
                padding: '12px 0', 
                borderBottom: '1px solid #f1f1f1', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxSizing: 'border-box',
                width: '100%'
              }}
            >
              <div style={{ paddingRight: '15px' }}>
                <strong>{appt.barbers?.name || 'Barber'}</strong> - {appt.appointment_date} ({appt.appointment_time})
              </div>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                backgroundColor: appt.status === 'pending' ? '#fff3cd' : appt.status === 'completed' ? '#d1e7dd' : '#f8d7da',
                color: appt.status === 'pending' ? '#856404' : appt.status === 'completed' ? '#0f5132' : '#842029'
              }}>
                {appt.status === 'pending' ? 'Pending' : appt.status === 'completed' ? 'Accepted' : 'Cancelled'}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
