export const translationEnhancements = {
  ka: {
    nav: {
      home: "მთავარი",
      searchTours: "ტურების ძებნა",
      openMenu: "ნავიგაციის გახსნა",
      closeMenu: "ნავიგაციის დახურვა",
    },
    common: {
      chooseCity: "აირჩიეთ ქალაქი",
      noSuggestions: "შესაბამისი შეთავაზებები ვერ მოიძებნა",
      popularDestinations: "პოპულარული მიმართულებები",
      viewResults: "შედეგების ნახვა",
      startTyping: "აკრიფეთ მინიმუმ 2 სიმბოლო",
      destination: "მიმართულება",
      searchPlaceholder: "მოძებნეთ",
    },
    home: {
      search: {
        fromLabel: "საიდან?",
        toLabel: "სად?",
        dateLabel: "როდის?",
      },
    },
    flights: {
      heroDescription:
        "მოძებნეთ ფრენები პრემიუმ სტილის ფორმით, ორჭოფი დაწკაპუნებებისგან დაცული ნაკადით და მკაფიო სტატუსებით მთელი გზის განმავლობაში.",
      recentSearch: "ბოლო ძიება",
      resultsLabel: "ნაპოვნი რეისები",
      helperText: "აირჩიეთ ქალაქი ან აეროპორტი ქართულად ან ინგლისურად.",
      placeholders: {
        from: "თბილისი ან TBS",
        to: "სტამბოლი ან IST",
      },
    },
    hotels: {
      heroDescription:
        "იხილეთ სასტუმროები იგივე ვიზუალურ სისტემაში, უფრო სუფთა ფორმით, მსუბუქი ჩრდილებით და სანდო ფოტო fallback-ებით.",
      cityPlaceholder: "მაგალითად: პარიზი",
      resultsLabel: "ნაპოვნი სასტუმროები",
    },
    restaurants: {
      heroDescription:
        "იპოვეთ რესტორნები იგივე მოგზაურობის სტილში, ცოცხალი ქალაქის ძიებით და სუფთა მედია წარმოდგენით.",
      cityPlaceholder: "მაგალითად: რომი",
      resultsLabel: "ნაპოვნი რესტორნები",
    },
    tours: {
      heroDescription: "",
      searchLabel: "ტურების ძიება",
      searchPlaceholder: "დანიშნულება, სათაური ან აღწერა",
      helper: "ძიება მუშაობს ქართულად და ინგლისურად.",
      resultsLabel: "ნაპოვნი ტურები",
      noMatchTitle: "ტურები ვერ მოიძებნა",
      noMatchMessage: "სცადეთ სხვა სიტყვა ან გაასუფთავეთ ფილტრი.",
      clearSearch: "ფილტრის გასუფთავება",
      openDetails: "ტურის ნახვა",
      detailLabel: "ტურის დეტალები",
      backToTours: "ტურებზე დაბრუნება",
      detailError: "ტურის ჩატვირთვა ვერ მოხერხდა.",
      relatedDates: "მომავალი თარიღები",
    },
    notFound: {
      title: "გვერდი ვერ მოიძებნა",
      message: "ეს მისამართი არ არსებობს. გადამისამართდით მთავარ გვერდზე.",
    },
  },
  en: {
    nav: {
      home: "Home",
      searchTours: "Search Tours",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
    },
    common: {
      chooseCity: "Choose city",
      noSuggestions: "No suggestions found",
      popularDestinations: "Popular destinations",
      viewResults: "View results",
      startTyping: "Type at least 2 characters",
      destination: "Destination",
      searchPlaceholder: "Search",
    },
    home: {
      search: {
        fromLabel: "Where from?",
        toLabel: "Where to?",
        dateLabel: "When?",
      },
    },
    flights: {
      heroDescription:
        "Search flights inside the same premium travel shell, with safer request pacing and clear feedback from first click to results.",
      recentSearch: "Recent search",
      resultsLabel: "Matching flights",
      helperText: "Choose a city or airport in Georgian or English.",
      placeholders: {
        from: "Tbilisi or TBS",
        to: "Istanbul or IST",
      },
    },
    hotels: {
      heroDescription:
        "Browse stays in the same design language with cleaner forms, softer surfaces, and reliable image fallbacks.",
      cityPlaceholder: "For example: Paris",
      resultsLabel: "Matching hotels",
    },
    restaurants: {
      heroDescription:
        "Discover restaurants in the same travel-planning style with live city suggestions and polished media handling.",
      cityPlaceholder: "For example: Rome",
      resultsLabel: "Matching restaurants",
    },
    tours: {
      heroDescription: "",
      searchLabel: "Search tours",
      searchPlaceholder: "Destination, title, or description",
      helper: "Search works across Georgian and English tour content.",
      resultsLabel: "Matching tours",
      noMatchTitle: "No tours found",
      noMatchMessage: "Try another keyword or clear the filter.",
      clearSearch: "Clear filter",
      openDetails: "View Tour",
      detailLabel: "Tour details",
      backToTours: "Back to tours",
      detailError: "We could not load this tour.",
      relatedDates: "Upcoming dates",
    },
    notFound: {
      title: "Page not found",
      message: "This address does not exist. Redirecting you back home.",
    },
  },
};

translationEnhancements.ka.hotels.heroDescription = "";
translationEnhancements.en.hotels.heroDescription = "";
translationEnhancements.ka.flights.heroDescription = "";
translationEnhancements.en.flights.heroDescription = "";
translationEnhancements.ka.restaurants.heroDescription = "";
translationEnhancements.en.restaurants.heroDescription = "";

translationEnhancements.ka.nav.contact = "კონტაქტი";
translationEnhancements.en.nav.contact = "Contact";
translationEnhancements.ka.common.close = "დახურვა";
translationEnhancements.en.common.close = "Close";

translationEnhancements.ka.app = translationEnhancements.ka.app || {};
translationEnhancements.en.app = translationEnhancements.en.app || {};
translationEnhancements.ka.app.pages = translationEnhancements.ka.app.pages || {};
translationEnhancements.en.app.pages = translationEnhancements.en.app.pages || {};
translationEnhancements.ka.app.pages.hotels = {
  ...(translationEnhancements.ka.app.pages.hotels || {}),
  eyebrow: "შეარჩიეთ სასურველი სასტუმრო",
  title: "",
  highlights: [],
};
translationEnhancements.en.app.pages.hotels = {
  ...(translationEnhancements.en.app.pages.hotels || {}),
  eyebrow: "Select your desired hotel",
  title: "",
  highlights: [],
};
translationEnhancements.ka.app.pages.flights = {
  ...(translationEnhancements.ka.app.pages.flights || {}),
  eyebrow: "შეარჩიეთ სასურველი მიმართულება",
  title: "",
};
translationEnhancements.en.app.pages.flights = {
  ...(translationEnhancements.en.app.pages.flights || {}),
  eyebrow: "Select the desired direction",
  title: "",
};
translationEnhancements.ka.app.pages.restaurants = {
  ...(translationEnhancements.ka.app.pages.restaurants || {}),
  eyebrow: "შეარჩიეთ სასურველი რესტორანი",
  title: "",
  highlights: [],
};
translationEnhancements.en.app.pages.restaurants = {
  ...(translationEnhancements.en.app.pages.restaurants || {}),
  title: "",
  highlights: [],
};

translationEnhancements.ka.contact = {
  eyebrow: "კონტაქტი",
  title: "დაგვიკავშირდით",
  description: "მისამართი, ტელეფონი და სოციალური არხები ერთ ადგილზე.",
  heading: "Around The World",
  helper: "მოგვწერეთ ან დაგვირეკეთ მოგზაურობის დასაგეგმად.",
  address: "მისამართი",
  phone: "ტელეფონი",
  gmail: "Gmail",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};
translationEnhancements.en.contact = {
  eyebrow: "Contact",
  title: "Contact",
  description: "Address, phone, and social channels in one place.",
  heading: "Around The World",
  helper: "Message or call us to plan your next trip.",
  address: "Address",
  phone: "Phone",
  gmail: "Gmail",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

translationEnhancements.ka.tourSearch = {
  title: "ტურების ძებნა",
  placeholder: "ჩაწერეთ მიმართულება ან ტურის სახელი",
  noResults: "ტურები ვერ მოიძებნა",
  viewTour: "ტურის ნახვა",
};
translationEnhancements.en.tourSearch = {
  title: "Search tours",
  placeholder: "Type destination or tour name",
  noResults: "No matching tours",
  viewTour: "View tour",
};

translationEnhancements.ka.admin = translationEnhancements.ka.admin || {};
translationEnhancements.en.admin = translationEnhancements.en.admin || {};
translationEnhancements.ka.admin.descriptionHelper =
  "შეგიძლიათ ჩასვათ ბმულები. ისინი საიტზე ავტომატურად clickable გახდება.";
translationEnhancements.en.admin.descriptionHelper =
  "You can paste links. They will become clickable on the site.";
