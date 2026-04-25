import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ThemeProvider } from "./theme/ThemeContext";

test("renders the flights page through react router", () => {
  window.localStorage.setItem("around-the-world-language", "en");

  render(
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

  expect(screen.getByRole("button", { name: /search flights/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^from$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^to$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/i am not a bot/i)).toBeInTheDocument();
});
