import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { fetchFlights, submitFlightBookingRequest } from "./lib/api";

jest.mock("./lib/api", () => ({
  fetchFlights: jest.fn(),
  submitFlightBookingRequest: jest.fn(),
}));

function renderFlightsPage() {
  window.localStorage.setItem("around-the-world-language", "en");

  return render(
    <ThemeProvider>
      <LanguageProvider>
        <MemoryRouter
          initialEntries={["/flights"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

afterEach(() => {
  fetchFlights.mockReset();
  submitFlightBookingRequest.mockReset();
  jest.useRealTimers();
});

test("renders the flights page through react router", async () => {
  renderFlightsPage();

  expect(
    await screen.findByRole(
      "button",
      { name: /search flights/i },
      { timeout: 5000 }
    )
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/^from$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^to$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/cabin/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/i am not a bot/i)).toBeInTheDocument();
});

test("submits the redesigned flight form with the existing search payload", async () => {
  jest.useFakeTimers();

  let resolveFlights;
  fetchFlights.mockReturnValue(
    new Promise((resolve) => {
      resolveFlights = resolve;
    })
  );

  renderFlightsPage();

  fireEvent.change(await screen.findByLabelText(/^from$/i), {
    target: { value: "TBS" },
  });
  fireEvent.change(screen.getByLabelText(/^to$/i), {
    target: { value: "IST" },
  });
  fireEvent.change(screen.getByLabelText(/departure/i), {
    target: { value: "2026-05-20" },
  });
  fireEvent.click(screen.getByLabelText(/i am not a bot/i));
  fireEvent.click(screen.getByRole("button", { name: /search flights/i }));

  expect(
    screen.getByRole("button", { name: /preparing search/i })
  ).toBeInTheDocument();

  await act(async () => {
    jest.advanceTimersByTime(900);
  });

  await waitFor(() =>
    expect(fetchFlights).toHaveBeenCalledWith({
      from: "TBS",
      to: "IST",
      date: "2026-05-20",
      tripType: "oneWay",
      cabin: "economy",
      adults: 1,
      children: 0,
      infants: 0,
    })
  );
  expect(
    screen.getByRole("button", { name: /searching flights/i })
  ).toBeInTheDocument();

  await act(async () => {
    resolveFlights({
      results: [
        {
          airline: "Budget Jet",
          airlines: [{ name: "Budget Jet", code: "BJ", logoUrl: "https://example.com/logo.png" }],
          flightNumber: "BJ10",
          departure: "2026-05-20T12:00:00Z",
          arrival: "2026-05-20T16:00:00Z",
          duration: "4h",
          stops: 1,
          price: 180,
          currency: "USD",
          originCode: "TBS",
          destinationCode: "IST",
          aircraft: "A320",
          routePath: ["TBS", "DXB", "IST"],
          segments: [
            {
              originCode: "TBS",
              originAirport: "Tbilisi",
              destinationCode: "DXB",
              destinationAirport: "Dubai",
              airline: "Budget Jet",
              airlineCode: "BJ",
              flightNumber: "BJ10",
              departure: "2026-05-20T12:00:00Z",
              arrival: "2026-05-20T14:00:00Z",
              duration: "2h",
              layoverAfter: {
                airport: "Dubai (DXB)",
                duration: "1h",
              },
            },
            {
              originCode: "DXB",
              originAirport: "Dubai",
              destinationCode: "IST",
              destinationAirport: "Istanbul",
              airline: "Budget Jet",
              airlineCode: "BJ",
              flightNumber: "BJ11",
              departure: "2026-05-20T15:00:00Z",
              arrival: "2026-05-20T16:00:00Z",
              duration: "1h",
            },
          ],
        },
        {
          airline: "Test Airways",
          flightNumber: "TA42",
          departure: "2026-05-20T08:00:00Z",
          arrival: "2026-05-20T10:30:00Z",
          duration: "2h 30m",
          stops: 0,
          price: 320,
          currency: "USD",
          bookingUrl: "https://example.com/booking",
          originCode: "TBS",
          destinationCode: "IST",
        },
        {
          airline: "Fast Air",
          flightNumber: "FA7",
          departure: "2026-05-20T09:00:00Z",
          arrival: "2026-05-20T10:00:00Z",
          duration: "1h",
          stops: 0,
          price: 500,
          currency: "USD",
          originCode: "TBS",
          destinationCode: "IST",
        },
      ],
    });
  });

  expect(await screen.findByText("Available Flights")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /recommended/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /cheapest/i })).toBeInTheDocument();
  expect(screen.getByText("Test Airways")).toBeInTheDocument();
  expect(screen.getAllByText("TA42").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: /cheapest/i }));
  expect(screen.getAllByRole("article")[0]).toHaveTextContent("Budget Jet");

  fireEvent.click(screen.getAllByText(/details/i)[0]);
  expect(screen.getByText("Aircraft")).toBeInTheDocument();
  expect(screen.getByText("A320")).toBeInTheDocument();
  expect(screen.getByText("Segment 1")).toBeInTheDocument();
  expect(screen.getByText(/Tbilisi \(TBS\) -> Dubai \(DXB\)/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Layover/i).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: /fastest/i }));
  expect(screen.getAllByRole("article")[0]).toHaveTextContent("Fast Air");
});

test("submits round trip, cabin, and traveler controls", async () => {
  jest.useFakeTimers();
  fetchFlights.mockResolvedValue({ results: [] });

  renderFlightsPage();

  fireEvent.click(await screen.findByRole("radio", { name: /round trip/i }));
  fireEvent.change(screen.getByLabelText(/^from$/i), {
    target: { value: "TBS" },
  });
  fireEvent.change(screen.getByLabelText(/^to$/i), {
    target: { value: "IST" },
  });
  fireEvent.change(screen.getByLabelText(/departure/i), {
    target: { value: "2026-05-20" },
  });
  fireEvent.change(screen.getByLabelText(/return/i), {
    target: { value: "2026-05-27" },
  });
  fireEvent.change(screen.getByLabelText(/cabin/i), {
    target: { value: "business" },
  });
  fireEvent.click(screen.getByRole("button", { name: /1 traveler/i }));
  fireEvent.click(screen.getByRole("button", { name: /increase children/i }));
  fireEvent.click(screen.getByLabelText(/i am not a bot/i));
  fireEvent.click(screen.getByRole("button", { name: /search flights/i }));

  await act(async () => {
    jest.advanceTimersByTime(900);
  });

  await waitFor(() =>
    expect(fetchFlights).toHaveBeenCalledWith({
      from: "TBS",
      to: "IST",
      date: "2026-05-20",
      returnDate: "2026-05-27",
      tripType: "roundTrip",
      cabin: "business",
      adults: 1,
      children: 1,
      infants: 0,
    })
  );
});

test("opens and submits the flight booking request modal", async () => {
  jest.useFakeTimers();
  fetchFlights.mockResolvedValue({
    results: [
      {
        airline: "Budget Jet",
        airlines: [{ name: "Budget Jet", code: "BJ" }],
        flightNumber: "BJ10, BJ11",
        departure: "2026-05-20T12:00:00Z",
        arrival: "2026-05-20T16:00:00Z",
        duration: "4h",
        stops: 1,
        price: 180,
        currency: "USD",
        originCode: "TBS",
        destinationCode: "IST",
        routePath: ["TBS", "DXB", "IST"],
        segments: [
          {
            originCode: "TBS",
            originAirport: "Tbilisi",
            destinationCode: "DXB",
            destinationAirport: "Dubai",
            airline: "Budget Jet",
            airlineCode: "BJ",
            flightNumber: "BJ10",
            departure: "2026-05-20T12:00:00Z",
            arrival: "2026-05-20T14:00:00Z",
            duration: "2h",
            layoverAfter: {
              airport: "Dubai (DXB)",
              duration: "1h",
            },
          },
          {
            originCode: "DXB",
            originAirport: "Dubai",
            destinationCode: "IST",
            destinationAirport: "Istanbul",
            airline: "Budget Jet",
            airlineCode: "BJ",
            flightNumber: "BJ11",
            departure: "2026-05-20T15:00:00Z",
            arrival: "2026-05-20T16:00:00Z",
            duration: "1h",
          },
        ],
      },
    ],
  });
  submitFlightBookingRequest.mockResolvedValue({ ok: true });

  renderFlightsPage();

  fireEvent.change(await screen.findByLabelText(/^from$/i), {
    target: { value: "TBS" },
  });
  fireEvent.change(screen.getByLabelText(/^to$/i), {
    target: { value: "IST" },
  });
  fireEvent.change(screen.getByLabelText(/departure/i), {
    target: { value: "2026-05-20" },
  });
  fireEvent.click(screen.getByLabelText(/i am not a bot/i));
  fireEvent.click(screen.getByRole("button", { name: /search flights/i }));

  await act(async () => {
    jest.advanceTimersByTime(900);
  });

  await waitFor(() => expect(fetchFlights).toHaveBeenCalled());
  await act(async () => {});

  await waitFor(() =>
    expect(screen.getAllByText(/Budget Jet/).length).toBeGreaterThan(0)
  );

  fireEvent.click(screen.getByRole("button", { name: /contact us to book/i }));
  expect(screen.getByRole("dialog", { name: /booking request/i })).toBeInTheDocument();
  expect(screen.getAllByText("TBS -> DXB -> IST").length).toBeGreaterThan(0);
  expect(screen.getByText(/ticket prices may change/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /send request/i }));
  expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
  expect(submitFlightBookingRequest).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText(/^name$/i), {
    target: { value: "Ana Traveler" },
  });
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: "ana@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/^phone$/i), {
    target: { value: "+995555111222" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /send request/i }));
  });

  await waitFor(() =>
    expect(submitFlightBookingRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: "Ana Traveler",
        customerEmail: "ana@example.com",
        customerPhone: "+995555111222",
        language: "en",
        selectedFlight: expect.objectContaining({
          route: "TBS -> DXB -> IST",
          airlines: expect.arrayContaining(["Budget Jet (BJ)"]),
          flightNumbers: expect.arrayContaining(["BJ10", "BJ11"]),
        }),
      })
    )
  );
  expect(
    await screen.findByText(/your request has been sent successfully/i)
  ).toBeInTheDocument();
});

test("keeps validation and empty states on the redesigned flight page", async () => {
  jest.useFakeTimers();

  renderFlightsPage();

  fireEvent.click(await screen.findByRole("button", { name: /search flights/i }));
  expect(
    screen.getByText(/please enter departure, destination, and travel date/i)
  ).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^from$/i), {
    target: { value: "TBS" },
  });
  fireEvent.change(screen.getByLabelText(/^to$/i), {
    target: { value: "TBS" },
  });
  fireEvent.change(screen.getByLabelText(/departure/i), {
    target: { value: "2026-05-20" },
  });
  fireEvent.click(screen.getByRole("button", { name: /search flights/i }));
  expect(
    screen.getByText(/departure and destination must be different/i)
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: /round trip/i }));
  fireEvent.change(screen.getByLabelText(/^to$/i), {
    target: { value: "IST" },
  });
  fireEvent.click(screen.getByRole("button", { name: /search flights/i }));
  expect(
    screen.getByText(/please choose a return date for round trip/i)
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: /multi city/i }));
  expect(screen.getByText(/multi-city flight search is coming soon/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /search flights/i })).toBeDisabled();

  fetchFlights.mockResolvedValue({ results: [] });

  fireEvent.click(screen.getByRole("radio", { name: /one way/i }));
  fireEvent.click(screen.getByLabelText(/i am not a bot/i));
  fireEvent.click(screen.getByRole("button", { name: /search flights/i }));

  await act(async () => {
    jest.advanceTimersByTime(900);
  });

  expect(await screen.findByText("No flights returned")).toBeInTheDocument();
});
