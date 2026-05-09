const AUTH_MESSAGES = {
  ka: {
    notConfigured: "ავტორიზაცია ჯერ არ არის კონფიგურირებული.",
    invalidEmail: "შეიყვანეთ სწორი ელ. ფოსტა.",
    invalidCredential: "ელ. ფოსტა ან პაროლი არასწორია.",
    emailInUse: "ამ ელ. ფოსტით ანგარიში უკვე არსებობს.",
    weakPassword: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.",
    popupClosed: "Google ავტორიზაცია გაუქმდა.",
    popupBlocked: "ბრაუზერმა Google ავტორიზაციის ფანჯარა დაბლოკა.",
    providerDisabled: "ავტორიზაციის ეს მეთოდი Firebase-ში ჩართული არ არის.",
    fallback: "ავტორიზაცია ვერ შესრულდა. სცადეთ თავიდან.",
  },
  en: {
    notConfigured: "Authentication is not configured yet.",
    invalidEmail: "Please enter a valid email address.",
    invalidCredential: "The email or password is incorrect.",
    emailInUse: "An account with this email already exists.",
    weakPassword: "Password must be at least 6 characters.",
    popupClosed: "Google sign-in was cancelled.",
    popupBlocked: "Your browser blocked the Google sign-in window.",
    providerDisabled: "This sign-in method is not enabled in Firebase.",
    fallback: "Authentication failed. Please try again.",
  },
};

export function getAuthErrorMessage(error, language = "ka", fallbackMessage = "") {
  const messages = AUTH_MESSAGES[language] || AUTH_MESSAGES.ka;

  switch (error?.code) {
    case "FIREBASE_NOT_CONFIGURED":
      return messages.notConfigured;
    case "auth/invalid-email":
      return messages.invalidEmail;
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return messages.invalidCredential;
    case "auth/email-already-in-use":
      return messages.emailInUse;
    case "auth/weak-password":
      return messages.weakPassword;
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return messages.popupClosed;
    case "auth/popup-blocked":
      return messages.popupBlocked;
    case "auth/operation-not-allowed":
      return messages.providerDisabled;
    default:
      return fallbackMessage || messages.fallback;
  }
}
