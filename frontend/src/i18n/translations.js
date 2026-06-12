export const translations = {
  ka: {
    nav: {
      flights: "ფრენები",
      hotels: "სასტუმროები",
      restaurants: "რესტორნები",
      tours: "ტურები",
      admin: "ადმინი",
      subtitle: "",
      lightMode: "ღია თემა",
      darkMode: "მუქი თემა",
    },
    common: {
      loading: "იტვირთება...",
      search: "ძებნა",
      price: "ფასი",
      rating: "რეიტინგი",
      reviews: "შეფასებები",
      duration: "ხანგრძლივობა",
      provider: "პროვაიდერი",
      updated: "განახლდა",
      category: "კატეგორია",
      imageUrl: "სურათის URL",
      description: "აღწერა",
      availableDates: "ხელმისაწვდომი თარიღები",
      city: "ქალაქი",
      date: "თარიღი",
      from: "საიდან",
      to: "სად",
      status: "სტატუსი",
      cuisine: "სამზარეულო",
      password: "პაროლი",
      logout: "გასვლა",
      edit: "რედაქტირება",
      delete: "წაშლა",
      cancel: "რედაქტირების გაუქმება",
      save: "შენახვა",
      create: "შექმნა",
      route: "მარშრუტი",
      flight: "ფრენა",
      latestRoute: "ბოლო მარშრუტი",
      servedFromCache: "კეშიდან მოწოდებული",
      recent: "ახლახან",
      all: "ყველა",
      unknown: "უცნობია",
      unavailable: "მიუწვდომელია",
      notRated: "რეიტინგი არ არის",
      noData: "მონაცემი არ არის",
      tooManyRequests: "ძალიან ბევრი მოთხოვნაა. ცოტა ხანს დაელოდეთ და თავიდან სცადეთ.",
      unknownDate: "თარიღი უცნობია",
      reviewsSuffix: "შეფასება",
      nonStop: "პირდაპირი",
      oneStop: "1 გადაჯდომა",
      multipleStops: "გადაჯდომა",
      stopsUnavailable: "გადაჯდომები უცნობია",
      ka: "KA",
      en: "EN",
      language: "ენა",
      theme: "თემა",
    },
    image: {
      hotelLabel: "სასტუმროს ხედი",
      restaurantLabel: "რესტორნის ხედი",
      tourLabel: "ტურის გამორჩეული კადრი",
      fallbackTitle: "Around The World",
      fallbackSubtitle:
        "სურათი ახლა მიუწვდომელია, მაგრამ მოგზაურობის დეტალები მზად არის.",
    },
    app: {
      pages: {
        flights: {
          label: "ფრენები",
          eyebrow: "მშვიდი დაჯავშნის პროცესი",
          title:
            "მოიძიეთ ფრენები უფრო ჭკვიანურად მაშინაც კი, როცა პროვაიდერები ხმაურიანდებიან.",
          description:
            "თანამედროვე სამოგზაურო საიტების დიდი, ძებნაზე ორიენტირებული ჰირო ბლოკით შთაგონებული, მაგრამ Around The World-ისთვის საკუთარი ფერთა პალიტრით, რბილი ტექსტებით და პრაქტიკული დაცვით თავიდან აშენებული გამოცდილება.",
          highlights: [],
        },
        hotels: {
          label: "სასტუმროები",
          eyebrow: "შერჩეული განთავსება",
          description:
            "სასტუმროების ხედი ეყრდნობა რედაქციულ ბარათებს, ჰაეროვან დაშორებებს და საიმედო სურათის fallback-ს, რათა გამოცდილება გამართული დარჩეს მაშინაც კი, როცა პროვაიდერის მედია ვერ იტვირთება.",
          highlights: [
            {
              label: "ბარათის ფოკუსი",
              value: "ფასი პირველ რიგში",
              text: "ფასი, რეიტინგი და პროვაიდერი ბარათის ზედა ნაწილშია, რათა შედარება სწრაფი იყოს.",
            },
            {
              label: "ვიზუალური მდგრადობა",
              value: "სურათის fallback",
              text: "დაზიანებული ან ცარიელი მედია ბრაუზერის შეცდომას აღარ აჩენს და მის ნაცვლად საკუთარ placeholder-ს ვიყენებთ.",
            },
            {
              label: "Tripadvisor-ის ნაკადი",
              value: "ნორმალიზებული სურათი",
              text: "ბექენდი ახლა ერთიან image ველს აბრუნებს და პროვაიდერის ნედლ photo სტრუქტურას აღარ აფრქვევს.",
            },
          ],
        },
        restaurants: {
          label: "რესტორნები",
          eyebrow: "შეარჩიეთ სასურველი რესტორანი",
          title: "კვების აღმოჩენა იმავე პრემიუმ დაგეგმვის ნაკადში დატოვეთ, სადაც ფრენები და განთავსებაა.",
          description:
            "რესტორნების ბარათები ახლა პლატფორმის ბუნებრივი გაგრძელებაა უკეთესი მედია fallback-ით, სუფთა იერარქიით და სამზარეულოზე ორიენტირებული განლაგებით.",
          highlights: [
            {
              label: "ადგილობრივი გემო",
              value: "სამზარეულოზე ორიენტირებული ბარათები",
              text: "სამზარეულო, რეიტინგი და სტატუსი პირველ რიგში ჩანს, რათა ბარათები უფრო პრაქტიკული იყოს.",
            },
            {
              label: "უსაფრთხო მედია",
              value: "დაზიანებული აიკონების გარეშე",
              text: "თუ Tripadvisor-ის მედია ვერ ჩაიტვირთა, დიზაინი სუფთა placeholder-ზე გადადის.",
            },
            {
              label: "მოგზაურობის რიტმი",
              value: "ერთიანი ვიზუალური ენა",
              text: "რესტორნები, სასტუმროები და ტურები ახლა ერთ ვიზუალურ სისტემას იყენებს.",
            },
          ],
        },
        tours: {
          label: "ტურები",
          eyebrow: "ორიგინალური მარშრუტები",
          title: "",
          description: "",
          highlights: [],
        },
        admin: {
          label: "ადმინი",
          eyebrow: "დაცული მართვა",
          title: "მართეთ ტურები ისე, რომ პლატფორმა ღია და დაუცველი პანელად არ დარჩეს.",
          description:
            "პაროლზე დაფუძნებული მსუბუქი დაცვა, JSON შენახვა და სუფთა ფორმა გაძლევთ მარტივ მართვას დღესვე, თან ისე, რომ სტრუქტურა მომავალში რეალურ ავტორიზაციასაც მოერგოს.",
          highlights: [
            {
              label: "დაცვა",
              value: "ბექენდის ტოკენი",
              text: "ფრონტენდი ინახავს მხოლოდ სესიის ტოკენს და არა სერვერზე კონფიგურირებულ პაროლს.",
            },
            {
              label: "ნაკადი",
              value: "შექმნა, რედაქტირება, წაშლა",
              text: "ტურების მართვა ახლა ერთ სივრცეშია ვალიდაციითა და უკუკავშირით.",
            },
            {
              label: "საცავი",
              value: "დღეს JSON",
              text: "მონაცემების ფენა გამოყოფილია, რათა შემდეგ MongoDB-ზე ან PostgreSQL-ზე გადასვლა სუფთად მოხდეს.",
            },
          ],
        },
      },
      features: [
        {
          eyebrow: "შერჩეული ნაკადი",
          title: "ძებნაზე ორიენტირებული, მოგზაურობაზე მორგებული სტრუქტურა",
          text: "დიდი ჰირო ბლოკები, ბარათების რიტმი, მიმართულებების ჩიპები და რედაქციული ტემპი პრემიუმ სამოგზაურო დემოებითაა შთაგონებული, თუმცა დიზაინი მთლიანად Around The World-ისთვისაა შექმნილი.",
        },
        {
          eyebrow: "საიმედო მედია",
          title: "placeholder-ზე დაფუძნებული სურათის დამუშავება",
          text: "სასტუმროებისა და რესტორნების ბარათები ბრაუზერის დაზიანებულ image UI-ს აღარ აჩენს. სწორი URL იტვირთება lazily, შეცდომა კი სუფთა placeholder-ით იცვლება.",
        },
        {
          eyebrow: "პლატფორმის ზრდა",
          title: "ტურები და ადმინი ერთიან გარსში",
          text: "საჯარო ტურები და დაცული რედაქტირება უკვე ერთად მუშაობს ისე, რომ ფრენების, სასტუმროებისა და რესტორნების მიმდინარე ნაკადი არ ირღვევა.",
        },
      ],
      footerDescription:
        "მოდულური სამოგზაურო პლატფორმა ფრენებისთვის, სასტუმროებისთვის, რესტორნებისთვის, ტურებისთვის და მსუბუქი ადმინ მართვისთვის.",
      footerNote: "შექმნილია სწრაფი და კომფორტული მოგზაურობის დაგეგმვისთვის.",
    },
    home: {
      eyebrow: "იმოგზაურე მსოფლიოს გარშემო",
      title: "",
      description: "",
      search: {
        fromPlaceholder: "გამგზავრების ქალაქი ან აეროპორტი",
        toPlaceholder: "დანიშნულების ქალაქი ან აეროპორტი",
        button: "ძებნა",
        humanCheck: "მე ბოტი არ ვარ",
        helper: "შეიყვანეთ მარშრუტი და პირდაპირ ფრენების ძიებაზე გადადით.",
        errors: {
          required: "შეიყვანეთ გამგზავრება, დანიშნულება და თარიღი.",
          human: "გთხოვთ, ძიებამდე დაადასტუროთ, რომ ბოტი არ ხართ.",
        },
      },
      cards: {
        tours: {
          category: "ტურები",
          title: "შეარჩიე ტური მარტივად",
          text: "იპოვე შენთვის სასურველი ტური, შეადარე მიმართულებები და დაგეგმე მოგზაურობა კომფორტულად.",
        },
        flights: {
          category: "ფრენები",
          title: "მოძებნე ავიაბილეთები",
          text: "შეამოწმე ფრენები სასურველ მიმართულებაზე და აირჩიე შენთვის მოსახერხებელი რეისი.",
        },
        hotels: {
          category: "სასტუმროები",
          title: "იპოვე კომფორტული სასტუმრო",
          text: "მოძებნე განთავსების ვარიანტები ქალაქის, ბიუჯეტის და მოგზაურობის სტილის მიხედვით.",
        },
        restaurants: {
          category: "რესტორნები",
          title: "აღმოაჩინე ადგილობრივი გემოები",
          text: "ნახე პოპულარული რესტორნები და შეარჩიე ადგილი სასიამოვნო გამოცდილებისთვის.",
        },
      },
    },
    flights: {
      sectionLabel: "ფრენების ძიება",
      heading: "",
      placeholders: {
        from: "JFK ან ლონდონი",
        to: "LAX ან პარიზი",
      },
      humanCheck: "მე ბოტი არ ვარ",
      searchButton: "ფრენების ძიება",
      searchingButton: "ფრენები იძებნება...",
      preparingButton: "ძებნა მზადდება...",
      guardrailsLabel: "ძებნის დაცვა",
      guardrails: {
        debounce: "დაყოვნების ფანჯარა",
        verification: "ადამიანის დადასტურება",
        verificationText: "ძებნა არ გააქტიურდება, სანამ დადასტურების მონიშვნა არ აირჩევა.",
        blocked: "დაბლოკილი პასუხის ტექსტი",
      },
      errors: {
        required: "შეიყვანეთ გამგზავრების ადგილი, დანიშნულება და თარიღი.",
        human: "გთხოვთ, დაადასტუროთ, რომ ბოტი არ ხართ.",
        searchFailed: "ფრენების ძებნისას დაფიქსირდა შეცდომა.",
      },
      latestRouteFallback: "ბოლო ძებნა",
      airlineFallback: "ავიაკომპანია",
      booking: "დაჯავშნის ნახვა",
      empty: {
        idleTitle: "დაიწყეთ მარშრუტით",
        idleMessage:
          "შეიყვანეთ გამგზავრება, დანიშნულება და თარიღი, რათა ნახოთ ფრენების ბარათები დროით, ხანგრძლივობით, ავიაკომპანიით და ფასით.",
        noResultsTitle: "ფრენები ვერ მოიძებნა",
        noResultsMessage:
          "ამ მარშრუტზე მონაცემები ვერ მივიღეთ. სცადეთ სხვა აეროპორტის კოდი, ქალაქი ან ახლო თარიღი.",
      },
    },
    hotels: {
      sectionLabel: "სასტუმროების ძიება",
      heading: "დაათვალიერეთ განთავსება რედაქციული რიტმით და საიმედო მედია fallback-ით.",
      checkIn: "შესვლის თარიღი",
      checkOut: "გასვლის თარიღი",
      searchButton: "სასტუმროების ძიება",
      searchingButton: "სასტუმროები იძებნება...",
      imageHandling: "სურათების მართვა",
      backendOutput: "ბექენდის შედეგი",
      backendOutputText: "სასტუმროების შედეგები ახლა ერთიან ნორმალიზებულ image ველს აბრუნებს.",
      frontendFallback: "ფრონტენდის fallback",
      frontendFallbackText:
        "ცარიელი ან დაზიანებული მედია პრემიუმ placeholder-ით იცვლება და ბრაუზერის შეცდომას აღარ აჩენს.",
      errors: {
        required: "შეიყვანეთ ქალაქი, შესვლის და გასვლის თარიღი.",
        invalidDates: "გასვლის თარიღი შესვლის შემდეგ უნდა იყოს.",
        searchFailed: "სასტუმროების ძიებისას დაფიქსირდა შეცდომა.",
      },
      empty: {
        idleTitle: "მოძებნეთ ქალაქში განთავსება",
        idleMessage:
          "აირჩიეთ მიმართულება და მოგზაურობის პერიოდი, რათა ნახოთ სასტუმროების ბარათები ფასით, რეიტინგით, პროვაიდერით და სურათის fallback-ით.",
        noResultsTitle: "სასტუმროები ვერ მოიძებნა",
        noResultsMessage:
          "სცადეთ უფრო დიდი ახლომდებარე ქალაქი ან შეცვალეთ თარიღები, თუ Tripadvisor ამ ძებნაზე შედეგებს არ აბრუნებს.",
      },
      card: {
        areaUnavailable: "რაიონი უცნობია",
        defaultSubtitle: "Tripadvisor სასტუმრო",
        viewStay: "სასტუმროს ნახვა",
      },
    },
    restaurants: {
      sectionLabel: "რესტორნების ძიება",
      heading: "კვების აღმოჩენა იმავე პრემიუმ მოგზაურობის დაგეგმვის გარსში გადაიტანეთ.",
      searchButton: "რესტორნების ძიება",
      searchingButton: "რესტორნები იძებნება...",
      notesLabel: "რესტორნების დიზაინის შენიშვნები",
      cardStructure: "ბარათის სტრუქტურა",
      cardStructureText:
        "რეიტინგი, შეფასებები, სამზარეულო და სტატუსი ახლა უფრო სუფთა იერარქიაშია, რომელიც სამოგზაურო რედაქციულ ბარათებს ჰგავს.",
      mediaFallback: "მედიის fallback",
      mediaFallbackText:
        "თუ რესტორნის სურათი არ არსებობს ან ვერ იტვირთება, მას სტილური placeholder ცვლის.",
      errors: {
        required: "რესტორნების ძიებამდე შეიყვანეთ ქალაქი.",
        searchFailed: "რესტორნების ძიებისას დაფიქსირდა შეცდომა.",
      },
      empty: {
        idleTitle: "მოძებნეთ კვების სცენა",
        idleMessage:
          "შეიყვანეთ ქალაქი, რათა მიიღოთ რესტორნების ბარათები სახელებით, რეიტინგით, სამზარეულოს ტიპით და სურათის fallback-ით.",
        noResultsTitle: "რესტორნები ვერ მოიძებნა",
        noResultsMessage:
          "სცადეთ ახლომდებარე ცენტრი ან უფრო ფართო მიმართულების სახელი, თუ ამ ძებნაზე რესტორნები არ ბრუნდება.",
      },
      card: {
        cityUnavailable: "ქალაქი უცნობია",
        unknownStatus: "უცნობია",
        variousCuisine: "სხვადასხვა",
        viewMenu: "მენიუს ნახვა",
      },
    },
    tours: {
      sectionLabel: "ტურების კოლექცია",
      heading: "საუკეთესო ღირებულების მარშრუტები რედაქციული ტურისტული სააგენტოს ატმოსფეროთი.",
      description: "",
      stackLabel: "",
      publicApi: "",
      publicApiText: "",
      storageLayer: "",
      storageLayerText: "",
      selectedTour: "არჩეული ტური",
      emptySelectionTitle: "აირჩიეთ ტური",
      emptySelectionMessage: "აირჩიეთ რომელიმე ტურის ბარათი, რათა დეტალები აქ ჩაიტვირთოს.",
      noToursTitle: "ტურები ჯერ არ არის",
      noToursMessage: "შექმენით ტურები ადმინის პანელიდან, რომ კატალოგი შეივსოს.",
      viewTour: "ტურის ნახვა",
    },
    admin: {
      loginLabel: "ადმინის შესვლა",
      loginHeading: "გახსენით ტურების მართვა",
      loginDescription:
        "ეს მსუბუქი დაცვა სერვერზე განსაზღვრულ გარემოს ცვლადზეა მიბმული. ფრონტენდი ინახავს მხოლოდ სესიის ტოკენს, რომელსაც ბექენდი აბრუნებს ავტორიზაციის შემდეგ.",
      passwordPlaceholder: "შეიყვანეთ ადმინის პაროლი",
      loginButton: "ადმინში შესვლა",
      loginLoading: "შესვლა მიმდინარეობს...",
      dashboardLabel: "ადმინის პანელი",
      dashboardHeading: "მართეთ საჯარო ტურების კატალოგი",
      sessionExpires: "სესიის ვადა",
      unknownExpiry: "უცნობია",
      logoutSuccess: "გამოსვლა შესრულდა.",
      loginSuccess: "ადმინის წვდომა გაიხსნა.",
      existingTours: "არსებული ტურები",
      catalogEntries: "კატალოგის ჩანაწერები",
      tourCountSuffix: "ტური",
      noToursTitle: "ტურები არ შექმნილა",
      noToursMessage: "ზემოთ მოცემული ფორმით დაამატეთ პირველი ტური კატალოგში.",
      editTour: "ტურის რედაქტირება",
      createTour: "ტურის შექმნა",
      formHeading: "შექმენით ახალი სამოგზაურო ისტორია",
      previewTitle: "ტურის პრევიუ",
      previewSubtitle:
        "დაამატეთ სურათის URL ან დატოვეთ ცარიელი, რათა გრადიენტული placeholder გამოჩნდეს.",
      georgianContent: "ქართული კონტენტი",
      englishContent: "ინგლისური კონტენტი",
      titleKa: "სათაური ქართულად",
      titleEn: "სათაური ინგლისურად",
      destinationKa: "მიმართულება ქართულად",
      destinationEn: "მიმართულება ინგლისურად",
      descriptionKa: "აღწერა ქართულად",
      descriptionEn: "აღწერა ინგლისურად",
      durationKa: "ხანგრძლივობა ქართულად",
      durationEn: "ხანგრძლივობა ინგლისურად",
      price: "ფასი",
      category: "კატეგორია",
      imageUrl: "სურათის URL",
      dates: "ხელმისაწვდომი თარიღები",
      datesPlaceholder: "2026-06-14, 2026-07-05",
      saveCreate: "ტურის შექმნა",
      saveUpdate: "ტურის განახლება",
      saving: "ინახება...",
      editAction: "რედაქტირება",
      deleteAction: "წაშლა",
      confirmDelete: "წავშალოთ ეს ტური? ის საჯარო ტურების გვერდიდან გაქრება.",
      errors: {
        passwordRequired: "გასაგრძელებლად შეიყვანეთ ადმინის პაროლი.",
        loginFailed: "ადმინში შესვლა ვერ მოხერხდა. სცადეთ თავიდან.",
        loadFailed: "ტურების ჩატვირთვისას დაფიქსირდა შეცდომა.",
        saveFailed: "ტურის შენახვისას დაფიქსირდა შეცდომა.",
        deleteFailed: "ტურის წაშლისას დაფიქსირდა შეცდომა.",
        titleKaRequired: "შეიყვანეთ ტურის სათაური ქართულად.",
        titleEnRequired: "შეიყვანეთ ტურის სათაური ინგლისურად.",
        destinationKaRequired: "შეიყვანეთ მიმართულება ქართულად.",
        destinationEnRequired: "შეიყვანეთ მიმართულება ინგლისურად.",
        descriptionKaRequired: "შეიყვანეთ აღწერა ქართულად.",
        descriptionEnRequired: "შეიყვანეთ აღწერა ინგლისურად.",
        durationKaRequired: "შეიყვანეთ ხანგრძლივობა ქართულად.",
        durationEnRequired: "შეიყვანეთ ხანგრძლივობა ინგლისურად.",
        priceInvalid: "შეიყვანეთ სწორი ფასი, რომელიც 0-ზე ნაკლები არ არის.",
        invalidDateFormat:
          "თარიღის ფორმატი არასწორია: {date}. გამოიყენეთ YYYY-MM-DD.",
      },
      success: {
        created: "ტური წარმატებით შეიქმნა.",
        updated: "ტური წარმატებით განახლდა.",
        deleted: "ტური წარმატებით წაიშალა.",
      },
    },
  },
  en: {
    nav: {
      flights: "Flights",
      hotels: "Hotels",
      restaurants: "Restaurants",
      tours: "Tours",
      admin: "Admin",
      subtitle: "",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
    },
    common: {
      loading: "Loading...",
      search: "Search",
      price: "Price",
      rating: "Rating",
      reviews: "Reviews",
      duration: "Duration",
      provider: "Provider",
      updated: "Updated",
      category: "Category",
      imageUrl: "Image URL",
      description: "Description",
      availableDates: "Available dates",
      city: "City",
      date: "Date",
      from: "From",
      to: "To",
      status: "Status",
      cuisine: "Cuisine",
      password: "Password",
      logout: "Logout",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel edit",
      save: "Save",
      create: "Create",
      route: "Route",
      flight: "Flight",
      latestRoute: "Latest route",
      servedFromCache: "Served from cache",
      recent: "Recently",
      all: "All",
      unknown: "Unknown",
      unavailable: "Unavailable",
      notRated: "Not rated",
      noData: "N/A",
      tooManyRequests: "Too many requests. Please wait and try again.",
      unknownDate: "Unknown date",
      reviewsSuffix: "reviews",
      nonStop: "Non-stop",
      oneStop: "1 stop",
      multipleStops: "stops",
      stopsUnavailable: "Stops unavailable",
      ka: "KA",
      en: "EN",
      language: "Language",
      theme: "Theme",
    },
    image: {
      hotelLabel: "Stay Preview",
      restaurantLabel: "Dining Scene",
      tourLabel: "Tour Highlight",
      fallbackTitle: "Around The World",
      fallbackSubtitle:
        "Image unavailable right now, but the trip details are still ready.",
    },
    app: {
      pages: {
        flights: {
          label: "Flights",
          eyebrow: "Select the desired direction",
          title: "Search smarter flights with gentler recovery when providers get noisy.",
          description:
            "Inspired by modern travel sites with large search-led hero sections, but rebuilt for Around The World with our own softer palette, calmer copy, and practical search guardrails.",
          highlights: [],
        },
        hotels: {
          label: "Hotels",
          eyebrow: "Select your desired hotel",
          title: "",
          description:
            "The hotel view leans into editorial-style cards, premium spacing, and resilient image fallbacks so the experience still feels polished even when a provider image fails.",
          highlights: [
            {
              label: "Card focus",
              value: "Price first",
              text: "Pricing, rating, and provider sit at the top of each card for quick scanning.",
            },
            {
              label: "Visual resilience",
              value: "Image fallback",
              text: "Broken or missing media now collapses into a custom travel placeholder instead of browser errors.",
            },
            {
              label: "Tripadvisor feed",
              value: "Normalized image",
              text: "The backend now sends a single image field rather than leaking raw provider photo structures.",
            },
          ],
        },
        restaurants: {
          label: "Restaurants",
          eyebrow: "Dining picks",
          title: "Keep dining discovery in the same premium planning flow as flights and stays.",
          description:
            "Restaurant cards now feel like a natural extension of the platform with stronger image handling, cleaner hierarchy, and cuisine-forward layouts.",
          highlights: [
            {
              label: "Local flavor",
              value: "Cuisine-led cards",
              text: "Cuisine type, rating, and open status land first so the cards feel actionable.",
            },
            {
              label: "Safer media",
              value: "No broken icons",
              text: "If Tripadvisor media fails, the design swaps to a polished placeholder instead of a browser broken-image state.",
            },
            {
              label: "Travel rhythm",
              value: "Consistent shell",
              text: "Restaurants, hotels, and tours now share one visual language across the platform.",
            },
          ],
        },
        tours: {
          label: "Tours",
          eyebrow: "Original itineraries",
          title: "",
          description: "",
          highlights: [],
        },
        admin: {
          label: "Admin",
          eyebrow: "Protected editing",
          title: "Manage tours without exposing the platform to an open, unauthenticated dashboard.",
          description:
            "Simple password-backed admin auth, JSON persistence, and a clean editing form make it easy to manage tours now while keeping the structure ready for real auth later.",
          highlights: [
            {
              label: "Protection",
              value: "Backend token",
              text: "The frontend stores a session token, not the configured admin password from the server.",
            },
            {
              label: "Workflow",
              value: "Create, edit, delete",
              text: "Tour management now lives in one dedicated place with validation and feedback messages.",
            },
            {
              label: "Storage",
              value: "JSON today",
              text: "The data layer is separated so it can migrate later to MongoDB or PostgreSQL cleanly.",
            },
          ],
        },
      },
      features: [
        {
          eyebrow: "Handpicked Flow",
          title: "Search-led, travel-first structure",
          text: "Large hero sections, strong card spacing, destination chips, and editorial pacing pull inspiration from premium travel demos while keeping the design unique to Around The World.",
        },
        {
          eyebrow: "Reliable Media",
          title: "Placeholder-first image handling",
          text: "Hotel and restaurant cards never surface browser broken-image UI anymore. Valid URLs render lazily, failures fall back cleanly, and card heights stay stable.",
        },
        {
          eyebrow: "Platform Growth",
          title: "Tours and admin now live in the same shell",
          text: "Public tours and protected admin editing are both wired in without breaking the working flights, hotels, and restaurants flow.",
        },
      ],
      footerDescription:
        "A modular travel planning shell for flights, hotels, restaurants, tours, and lightweight admin management.",
      footerNote: "Built for responsive trip planning.",
    },
    home: {
      eyebrow: "Discover new journeys",
      title: "",
      description: "",
      search: {
        fromPlaceholder: "Departure city or airport",
        toPlaceholder: "Destination city or airport",
        button: "Search",
        humanCheck: "I am not a bot",
        helper: "Enter a route and continue straight into flight search.",
        errors: {
          required: "Please enter departure, destination, and travel date.",
          human: "Please confirm that you are not a bot before searching.",
        },
      },
      cards: {
        tours: {
          category: "Tours",
          title: "Find Your Next Tour",
          text: "Explore available tours, compare destinations, and plan your trip with confidence.",
        },
        flights: {
          category: "Flights",
          title: "Search for Flights",
          text: "Check flights for your preferred route and choose the option that fits your travel plans.",
        },
        hotels: {
          category: "Hotels",
          title: "Find a Comfortable Stay",
          text: "Browse hotels by destination, budget, and travel style.",
        },
        restaurants: {
          category: "Restaurants",
          title: "Discover Local Dining",
          text: "Explore popular restaurants and find the right place for a better travel experience.",
        },
      },
    },
    flights: {
      sectionLabel: "Flight Search",
      heading: "",
      placeholders: {
        from: "JFK or London",
        to: "LAX or Paris",
      },
      humanCheck: "I am not a bot",
      searchButton: "Search Flights",
      searchingButton: "Searching flights...",
      preparingButton: "Preparing search...",
      guardrailsLabel: "Search guardrails",
      guardrails: {
        debounce: "Debounce window",
        verification: "Human verification",
        verificationText: "Searches stay disabled until the confirmation checkbox is selected.",
        blocked: "Blocked response copy",
      },
      errors: {
        required: "Please enter departure, destination, and travel date.",
        human: "Please confirm that you are not a bot before searching.",
        searchFailed: "Something went wrong while searching flights.",
      },
      latestRouteFallback: "Recent search",
      airlineFallback: "Airline",
      booking: "View booking",
      empty: {
        idleTitle: "Start with a route",
        idleMessage:
          "Enter an origin, destination, and travel date to see flight cards with timing, duration, airline, and pricing.",
        noResultsTitle: "No flights returned",
        noResultsMessage:
          "We did not get any itineraries for that route. Try a different airport code, city, or nearby date.",
      },
    },
    hotels: {
      sectionLabel: "Hotel Search",
      heading: "Explore stays with editorial spacing and resilient media handling.",
      checkIn: "Check-in",
      checkOut: "Check-out",
      searchButton: "Search Hotels",
      searchingButton: "Searching hotels...",
      imageHandling: "Image handling",
      backendOutput: "Backend output",
      backendOutputText: "Hotel results now expose a single normalized image field.",
      frontendFallback: "Frontend fallback",
      frontendFallbackText:
        "Missing or failing media swaps into a premium placeholder card instead of browser error UI.",
      errors: {
        required: "Please enter a city, check-in date, and check-out date.",
        invalidDates: "Check-out must be after check-in.",
        searchFailed: "Something went wrong while searching hotels.",
      },
      empty: {
        idleTitle: "Search a city stay",
        idleMessage:
          "Choose a destination and travel window to see hotel cards with pricing, rating, provider details, and graceful media fallbacks.",
        noResultsTitle: "No hotels returned",
        noResultsMessage:
          "Try a larger nearby city or adjust your dates if Tripadvisor does not return stays for this search.",
      },
      card: {
        areaUnavailable: "Area unavailable",
        defaultSubtitle: "Tripadvisor hotel",
        viewStay: "View stay",
      },
    },
    restaurants: {
      sectionLabel: "Restaurant Search",
      heading: "Bring restaurant discovery into the same premium travel-planning shell.",
      searchButton: "Search Restaurants",
      searchingButton: "Searching restaurants...",
      notesLabel: "Dining design notes",
      cardStructure: "Card structure",
      cardStructureText:
        "Ratings, reviews, cuisine, and status now sit in a cleaner hierarchy inspired by travel editorial cards.",
      mediaFallback: "Media fallback",
      mediaFallbackText:
        "Missing or broken restaurant images are replaced by a styled placeholder instead of broken-image browser chrome.",
      errors: {
        required: "Please enter a city before searching restaurants.",
        searchFailed: "Something went wrong while searching restaurants.",
      },
      empty: {
        idleTitle: "Search a dining scene",
        idleMessage:
          "Enter a city to pull restaurant cards with names, ratings, cuisine types, and graceful image fallbacks.",
        noResultsTitle: "No restaurants returned",
        noResultsMessage:
          "Try a nearby city center or a broader destination name if no restaurant cards come back for this search.",
      },
      card: {
        cityUnavailable: "City unavailable",
        unknownStatus: "Unknown",
        variousCuisine: "Various",
        viewMenu: "View menu",
      },
    },
    tours: {
      sectionLabel: "Tour Collection",
      heading: "Best-value itineraries with an editorial travel-agency feel.",
      description: "",
      stackLabel: "",
      publicApi: "",
      publicApiText: "",
      storageLayer: "",
      storageLayerText: "",
      selectedTour: "Selected tour",
      emptySelectionTitle: "Choose a tour",
      emptySelectionMessage: "Select one of the tour cards to load more detail here.",
      noToursTitle: "No tours yet",
      noToursMessage: "Create tours from the admin panel to start building the catalog.",
      viewTour: "View Tour",
    },
    admin: {
      loginLabel: "Admin Login",
      loginHeading: "Unlock tour management",
      loginDescription:
        "This lightweight admin gate is backed by a server-side environment variable. The frontend only stores the session token returned by the backend after login.",
      passwordPlaceholder: "Enter admin password",
      loginButton: "Enter Admin",
      loginLoading: "Signing in...",
      dashboardLabel: "Admin Dashboard",
      dashboardHeading: "Manage the public tours catalog",
      sessionExpires: "Session expires",
      unknownExpiry: "Unknown",
      logoutSuccess: "Logged out.",
      loginSuccess: "Admin access unlocked.",
      existingTours: "Existing tours",
      catalogEntries: "Catalog entries",
      tourCountSuffix: "tours",
      noToursTitle: "No tours created",
      noToursMessage: "Use the form above to add your first tour to the catalog.",
      editTour: "Edit tour",
      createTour: "Create tour",
      formHeading: "Curate a new travel story",
      previewTitle: "Tour preview",
      previewSubtitle:
        "Add an image URL or leave blank for the gradient placeholder.",
      georgianContent: "Georgian content",
      englishContent: "English content",
      titleKa: "Georgian title",
      titleEn: "English title",
      destinationKa: "Georgian destination",
      destinationEn: "English destination",
      descriptionKa: "Georgian description",
      descriptionEn: "English description",
      durationKa: "Georgian duration",
      durationEn: "English duration",
      price: "Price",
      category: "Category",
      imageUrl: "Image URL",
      dates: "Available dates",
      datesPlaceholder: "2026-06-14, 2026-07-05",
      saveCreate: "Create tour",
      saveUpdate: "Update tour",
      saving: "Saving...",
      editAction: "Edit",
      deleteAction: "Delete",
      confirmDelete: "Delete this tour? This will remove it from the public tours page.",
      errors: {
        passwordRequired: "Enter the admin password to continue.",
        loginFailed: "Admin sign-in failed. Please try again.",
        loadFailed: "Something went wrong while loading tours.",
        saveFailed: "Something went wrong while saving the tour.",
        deleteFailed: "Something went wrong while deleting the tour.",
        titleKaRequired: "Please enter a Georgian tour title.",
        titleEnRequired: "Please enter an English tour title.",
        destinationKaRequired: "Please enter a Georgian destination.",
        destinationEnRequired: "Please enter an English destination.",
        descriptionKaRequired: "Please enter a Georgian description.",
        descriptionEnRequired: "Please enter an English description.",
        durationKaRequired: "Please enter a Georgian duration.",
        durationEnRequired: "Please enter an English duration.",
        priceInvalid: "Please enter a valid price greater than or equal to 0.",
        invalidDateFormat: "Invalid date format: {date}. Use YYYY-MM-DD.",
      },
      success: {
        created: "Tour created successfully.",
        updated: "Tour updated successfully.",
        deleted: "Tour deleted successfully.",
      },
    },
  },
};

translations.ka.common.providerUnavailable =
  "სერვისი დროებით მიუწვდომელია. სცადეთ მოგვიანებით.";
translations.en.common.providerUnavailable =
  "Service is temporarily unavailable. Please try again later.";
translations.ka.app.pages.hotels.eyebrow = "შეარჩიეთ სასურველი სასტუმრო";
translations.ka.app.pages.hotels.highlights = [];
translations.en.app.pages.hotels.highlights = [];
translations.ka.hotels.heading = "";
translations.en.hotels.heading = "";
translations.ka.hotels.imageHandling = "";
translations.en.hotels.imageHandling = "";
translations.ka.hotels.backendOutput = "";
translations.en.hotels.backendOutput = "";
translations.ka.hotels.backendOutputText = "";
translations.en.hotels.backendOutputText = "";
translations.ka.hotels.frontendFallback = "";
translations.en.hotels.frontendFallback = "";
translations.ka.hotels.frontendFallbackText = "";
translations.en.hotels.frontendFallbackText = "";
translations.ka.hotels.empty.idleTitle = "";
translations.en.hotels.empty.idleTitle = "";
translations.ka.hotels.empty.idleMessage = "";
translations.en.hotels.empty.idleMessage = "";
translations.ka.app.pages.flights.eyebrow = "შეარჩიეთ სასურველი მიმართულება.";
translations.ka.app.pages.flights.title = "";
translations.en.app.pages.flights.title = "";
translations.ka.app.pages.restaurants.title = "";
translations.en.app.pages.restaurants.title = "";
translations.ka.app.pages.restaurants.highlights = [];
translations.en.app.pages.restaurants.highlights = [];
translations.ka.restaurants.heading = "";
translations.en.restaurants.heading = "";
translations.ka.restaurants.notesLabel = "";
translations.en.restaurants.notesLabel = "";
translations.ka.restaurants.cardStructure = "";
translations.en.restaurants.cardStructure = "";
translations.ka.restaurants.cardStructureText = "";
translations.en.restaurants.cardStructureText = "";
translations.ka.restaurants.mediaFallback = "";
translations.en.restaurants.mediaFallback = "";
translations.ka.restaurants.mediaFallbackText = "";
translations.en.restaurants.mediaFallbackText = "";
translations.ka.restaurants.empty.idleTitle = "";
translations.en.restaurants.empty.idleTitle = "";
translations.ka.restaurants.empty.idleMessage = "";
translations.en.restaurants.empty.idleMessage = "";
