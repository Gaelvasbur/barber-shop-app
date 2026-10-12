import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ClientView({ session }) {
  const [barbers, setBarbers] = useState([])
  const [myAppointments, setMyAppointments] = useState([]) // State to store client appointments
  const [selectedBarber, setSelectedBarber] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Function to load barbers and appointments for this specific client
  const fetchData = async () => {
    try {
      // 1. Fetch barbers data catalog
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
      if (barbersError) throw barbersError
      setBarbers(barbersData || [])

      // 2. Fetch appointments for the current client linking the barber name
      const { data: apptsData, error: apptsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          barbers (name)
        `)
        .eq('client_id', session.user.id) // Security filter: scope query down to this user session row space
        .order('appointment_date', { ascending: true })

      if (apptsError) throw apptsError
      setMyAppointments(apptsData || [])
    } catch (error) {
      console.error('Error loading data:', error.message)
      setErrorMessage('An error occurred while fetching information.')
    }
  };

  useEffect(() => {
    fetchData()
  }, [session])
  
  const handleReserve = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const currentUserId = session?.user?.id || (await supabase.auth.getUser()).data.user?.id;

      if (!currentUserId) {
        throw new Error('User session not found. Please sign in again.');
      }

      if (!selectedBarber) {
        throw new Error('Please select a barber.');
      }

      // 1. DIRECT FORMATTING: Take native HTML5 strings directly ("YYYY-MM-DD" and "HH:MM")
      let formattedDate = date;
      let formattedTime = time;

      // 2. TIMING ENFORCEMENT LAYER: Guard clause protecting top-of-the-hour alignment slots (HH:00)
      if (formattedTime) {
        const timeParts = formattedTime.split(':');
        const minutes = timeParts[1];
        
        // Hard-abort transaction if minute values are modified outside standard zero-bound increments
        if (minutes !== '00') {
          throw new Error('Appointments can only be booked exactly at the top of the hour (e.g., 1:00, 2:00). Minutes are invalid.');
        }
      }

      // Ensure strict HH:MM:SS format compatibility for PostgreSQL time columns
      if (formattedTime && formattedTime.split(':').length === 2) {
        formattedTime = `${formattedTime}:00`;
      }

      // 3. ID CASTING: Safely handle numeric IDs or UUID hashes
      const finalBarberId = isNaN(Number(selectedBarber)) ? selectedBarber : Number(selectedBarber);

      // 4. DATABASE INSERTION WITH UNIQUE COLLISION HANDLING
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
        // Intercept PostgreSQL unique constraint index triggers (error code 23505)
        if (insertError.code === '23505') {
          throw new Error('This specific hour slot is already booked for this barber. Please select another time.');
        }
        throw insertError;
      }

      setSuccessMessage('Your appointment has been successfully scheduled!')
      setSelectedBarber('')
      setDate('')
      setTime('')
      
      fetchData()
    } catch (error) {
      console.error('Database rejection payload:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', position: 'relative' }}>
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
          <select value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value="">-- Select a professional --</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name} - {b.specialty}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Date:</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Time:</label>
          {/* step="3600" strips minute granularities out of the default native interface UI wheel */}
          <input 
            type="time" 
            value={time} 
            onChange={(e) => setTime(e.target.value)} 
            required 
            step="3600" 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
          />
        </div>
        <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '10px', backgroundColor: isSubmitting ? '#ccc' : '#222', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
          {isSubmitting ? 'Checking availability...' : 'Confirm Booking'}
        </button>
      </form>

      {/* --- NEW SECTION: MY APPOINTMENTS HISTORY --- */}
      <h3 style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>My Bookings</h3>
      <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
        {myAppointments.length === 0 ? (
          <li style={{ color: '#777', fontStyle: 'italic' }}>No appointments registered yet.</li>
        ) : (
          myAppointments.map((appt) => (
            <li key={appt.id} style={{ padding: '10px', borderBottom: '1px solid #f1f1f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{appt.barbers?.name || 'Barber'}</strong> - {appt.appointment_date} ({appt.appointment_time})
              </div>
              <span style={{
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '12px',
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