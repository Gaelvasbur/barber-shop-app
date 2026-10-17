import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Define the shape of the nested client relation profile row space
interface NestedProfile {
  full_name: string | null
}

// Define the shape of the nested barber relation row space
interface NestedBarber {
  name: string | null
}

// Define the core structural model for an global admin appointment view representation
interface AdminAppointment {
  id: number
  appointment_date: string
  appointment_time: string
  status: string
  profiles: NestedProfile | null
  barbers: NestedBarber | null
}

export default function AdminDashboard() {
  // Enforce strong state hooks mapping explicit structural system entities
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Load all scheduled appointments down from the PostgreSQL backend database
  const fetchAppointments = async (): Promise<void> => {
    try {
      setLoading(true)
      
      // Advanced relational query architecture connecting primary tables with structural mappings
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          profiles (full_name),
          barbers (name)
        `)
        .order('appointment_date', { ascending: true })

      if (error) throw error
      
      // Safe casting to enforce types inside asynchronous network transfers
      setAppointments((data as unknown as AdminAppointment[]) || [])
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error loading schedule:', error.message)
      } else {
        console.error('An unmapped infrastructure fault blocked the schedule retrieval.')
      }
      setErrorMessage('Could not retrieve the appointments schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAppointments()
  }, [])

  const updateStatus = async (id: number, newStatus: string): Promise<void> => {
  try {
    // Agregamos select() para obligar a Supabase a retornar la fila mutada bajo RLS
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Si el RLS bloqueó el update, data vendrá vacío []
    if (!data || data.length === 0) {
      throw new Error("Privileges verification failed. Database rejected the update request.");
    }
    
    setAppointments((prevAppts) =>
      prevAppts.map((appt) =>
        appt.id === id ? { ...appt, status: newStatus } : appt
      )
    );
    alert(`Appointment #${id} successfully marked as ${newStatus}.`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error updating status:', error.message);
      alert(`Could not update status: ${error.message}`);
    } else {
      console.error('An unexpected transmission anomaly occurred.');
      alert('Could not update the appointment status.');
    }
  }
};
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h3>Loading global schedule...</h3>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', position: 'relative' }}>
      {/* Sign Out Action Trigger Button */}
      <button 
        onClick={async () => {
          await supabase.auth.signOut()
        }} 
        style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
      >
        Sign Out
      </button>

      <h2 style={{ paddingTop: '20px' }}>Admin Dashboard - ChopTime Appointments</h2>
      
      {errorMessage && (
        <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', textAlign: 'left' }}>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Client</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Date / Time</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Barber</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>
                No appointments scheduled in the system.
              </td>
            </tr>
          ) : (
            appointments.map((appt) => (
              <tr key={appt.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  {appt.profiles?.full_name || 'Unknown'}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  {appt.appointment_date} at {appt.appointment_time}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  {appt.barbers?.name || 'Unassigned'}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: appt.status === 'pending' ? '#fff3cd' : appt.status === 'completed' ? '#d1e7dd' : '#f8d7da',
                    color: appt.status === 'pending' ? '#856404' : appt.status === 'completed' ? '#0f5132' : '#842029'
                  }}>
                    {appt.status}
                  </span>
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  {appt.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => void updateStatus(appt.id, 'completed')} 
                        style={{ marginRight: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => void updateStatus(appt.id, 'cancelled')} 
                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
