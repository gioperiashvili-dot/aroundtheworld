export const contactDetails = {
  phone: "+995 595 47 55 33",
  gmail: "info@aroundworld.ge",
  whatsapp: "+995 595 47 55 33",
  facebook: "https://www.facebook.com/profile.php?id=61577765184535",
  instagram: "https://www.instagram.com/AroundTheWorld",
  address: "თბილისი: სამამულო ომის გმირების ქუჩა #97"
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
