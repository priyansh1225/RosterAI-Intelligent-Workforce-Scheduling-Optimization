import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight, Command } from 'lucide-react'

export function UnauthorizedPage() {
  return (
    <main className="standalone-screen">
      <div className="login-brand">
        <div className="brand-mark">
          <Command size={20} />
        </div>
        <div>
          <b>
            Roster<span>AI</span>
          </b>
          <small>HOTEL WORKFORCE OPERATIONS</small>
        </div>
      </div>
      <section className="standalone-card">
        <div className="empty-icon">
          <ShieldAlert size={28} color="#d64545" />
        </div>
        <h1>Access Restricted</h1>
        <p>
          You do not have the required permissions to access this workspace or action.
          Roster review, publication, and supervisor verification require authorized backend credentials.
        </p>
        <Link className="button button-primary" to="/admin/dashboard">
          Return to Dashboard <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  )
}

export function NotFoundPage() {
  return (
    <main className="standalone-screen">
      <div className="login-brand">
        <div className="brand-mark">
          <Command size={20} />
        </div>
        <div>
          <b>
            Roster<span>AI</span>
          </b>
          <small>HOTEL WORKFORCE OPERATIONS</small>
        </div>
      </div>
      <section className="standalone-card">
        <div className="empty-icon">
          <Command size={28} color="#778196" />
        </div>
        <h1>Page Not Found (404)</h1>
        <p>The requested page or route does not exist in the RosterAI application suite.</p>
        <Link className="button button-primary" to="/admin/dashboard">
          Return to Dashboard <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  )
}
