export default function PageLoader({ label = "AroundWorld" }) {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-label={`${label} loading`}>
      <div className="page-loader__panel">
        <div className="page-loader__flightpath" aria-hidden="true">
          <span className="page-loader__trail" />
          <span className="page-loader__plane">
            <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
              <path
                d="M61.2 30.4c1.4.8 1.4 2.4 0 3.2l-8.8 5.2A20.7 20.7 0 0 1 42 41.7h-4.1L28.4 57c-.4.7-1.1 1.1-1.9 1.1h-5.2c-1 0-1.7-1-1.4-1.9l5.8-14.5h-9.5l-5.1 6.1c-.4.5-1 .8-1.7.8H5.8c-.9 0-1.5-.9-1.1-1.7l4-9-4.6-2.7c-.9-.5-.9-1.9 0-2.4l4.6-2.7-4-9c-.4-.8.2-1.7 1.1-1.7h3.6c.7 0 1.3.3 1.7.8l5.1 6.1h9.5L19.9 11.8c-.3-.9.4-1.9 1.4-1.9h5.2c.8 0 1.5.4 1.9 1.1l9.5 15.3H42c3.7 0 7.3 1 10.4 2.9l8.8 5.2Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>

        <p className="page-loader__brand">
          <span className="page-loader__brand-text">{label}</span>
        </p>
      </div>
    </div>
  );
}
