import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { fetchFlights } from "./lib/api";

jest.mock("./lib/api", () => ({
  fetchFlights: jest.fn(),
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
    })
  );
  expect(
    screen.getByRole("button", { name: /searching flights/i })
  ).toBeInTheDocument();

  await act(async () => {
    resolveFlights({
      results: [
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
      ],
    });
  });

  expect(await screen.findByText("Available Flights")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /recommended/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /cheapest/i })).toBeInTheDocument();
  expect(screen.getByText("Test Airways")).toBeInTheDocument();
  expect(screen.getAllByText("TA42").length).toBeGreaterThan(0);
});

test("keeps validation and empty states on the redesigned flight page", async () => {
  jest.useFakeTimers();

  renderFlightsPage();

  fireEvent.click(await screen.findByRole("button", { name: /search flights/i }));
  expect(
    screen.getByText(/please enter departure, destination, and travel date/i)
  ).toBeInTheDocument();

  fetchFlights.mockResolvedValue({ results: [] });

  fireEvent.change(screen.getByLabelText(/^from$/i), {
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

  expect(await screen.findByText("No flights returned")).toBeInTheDocument();
});
