from agents import parse_natural_language_intake, lookup_kbli_tool

tests = [
    "saya geraldo dari bondalem, gayam, sukaharjo, saya mau bikin usaha jual beli hp, modal 500jt",
    "Halo nama saya Ibu Rina tinggal di Jl. Gatot Subroto No 45 Bandung mau buka usaha salon kecantikan dan potong rambut dengan modal 15 juta",
    "abdi teh kang asep ti kampung sukaluyu garut bade dagang basreng lada sareng seblak modalna dua juta rupiah",
    "kulo Pak Joko saking dusun krajan klaten badhe ternak lele lan budidaya iwak modal 25jt omset 500 ekor sebulan no hp 081234567890",
    "Atas nama Budi Santoso alamat di Perumahan Indah Blok C3 No.12 Bogor, mau usaha konveksi jahit baju seragam, dana awal 50 juta",
    "Gue Kevin dari Kelapa Gading Jakarta Utara pengen buka warkop kopi kekinian modal 30jt",
    "Nama Toko: Toko Beras Makmur Jaya, pemilik: H. Ahmad Fauzi, lokasi di Pasar Minggu Jakarta Selatan, modal 100jt",
    "Bli Wayan asal Ubud Gianyar Bali mau usaha kerajinan ukir kayu mebel modal lima puluh juta",
    "mau buka jasa cuci motor dan mobil steam di jalan merdeka no 8 tasikmalaya atas nama Hendra modal 12jt",
]

for i, t in enumerate(tests, 1):
    res = parse_natural_language_intake(t)
    kbli = lookup_kbli_tool(f"{res['nama_usaha']} {res['jenis_usaha']} {t}")
    print(f"[{i}] NAMA: {res['nama_lengkap']} | USAHA: {res['nama_usaha']} | MODAL: {res['modal_usaha_rp']} | ALAMAT: {res['alamat']} | KBLI: {kbli['kode']} ({kbli['judul'][:30]}...)")
