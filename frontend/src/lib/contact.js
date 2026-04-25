export const contactDetails = {
  address: "თბილისი, რუსთაველის გამზირი #123",
  phone: "+995 595 47 55 33",
  facebook: "https://www.facebook.com/profile.php?id=61577765184535",
  instagram: "https://www.instagram.com/AroundTheWorld",
  whatsapp: "+995 595 47 55 33",
  gmail: "atw.aroundtheworld2024@gmail.com",
};

export function getPhoneHref(phone = contactDetails.phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function getWhatsAppHref(phone = contactDetails.whatsapp) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export function getEmailHref(email = contactDetails.gmail) {
  return `mailto:${email}`;
}
