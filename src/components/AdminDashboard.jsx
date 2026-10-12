import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // Load all appointments from the database when the Dashboard initializes
  const fetchAppointments = async () => {
    try {
      setLoading(true)
      // Advanced relational query: fetches the appointment and links profiles and barbers
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
      setAppointments(data || [])
    } catch (error) {
      console.error('Error loading schedule:', error.message)
      setErrorMessage('Could not retrieve the appointments schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  // Modify the appointment status in PostgreSQL (Solution to Changing Requirement)
  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      
      // Update local state to instantly reflect the change in the visual table
      setAppointments(appointments.map(appt => 
        appt.id === id ? { ...appt, status: newStatus } : appt
      ))
      alert(`Appointment #${id} successfully marked as ${newStatus}.`)
    } catch (error) {
      console.error('Error updating status:', error.message)
      alert('Could not update the appointment status. Please check your network connection.')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}><h3>Loading global schedule...</h3></div>

  return (
  <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', position: 'relative' }}>
    {/* Sign Out Button */}
    <button 
      onClick={async () => {
        await supabase.auth.signOut()
      }} 
      style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
    >
      Sign Out
    </button>

    <h2 style={{ paddingTop: '20px' }}>Admin Dashboard - ChopTime Appointments</h2>

      
      {errorMessage && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>⚠️ {errorMessage}</div>}

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
            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No appointments scheduled in the system.</td></tr>
          ) : (
            appointments.map((appt) => (
              <tr key={appt.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{appt.profiles?.full_name || 'Unknown'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{appt.appointment_date} at {appt.appointment_time}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{appt.barbers?.name || 'Unassigned'}</td>
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
                      <button onClick={() => updateStatus(appt.id, 'completed')} style={{ marginRight: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                        Accept
                      </button>
                      <button onClick={() => updateStatus(appt.id, 'cancelled')} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
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
