# RC4 Encryption — Stream Cipher

Cài đặt thuật toán **RC4** (Rivest Cipher 4) để **mã hóa** một chuỗi văn bản bằng một khóa (key) do người dùng nhập vào.

## Đề bài

> Cài đặt thuật toán mã hóa RC4. Người dùng nhập vào plaintext và key, chương trình sẽ thực hiện mã hóa và in ra ciphertext.

## Mô tả

RC4 là một thuật toán **mã hóa dòng** (stream cipher) đối xứng, được thiết kế bởi Ron Rivest vào năm 1987. RC4 hoạt động bằng cách sinh ra một **dòng khóa giả ngẫu nhiên** (keystream) từ khóa bí mật, sau đó XOR dòng khóa này với plaintext để tạo ra ciphertext.

### Đặc điểm của RC4

- **Loại:** Stream cipher (mã hóa dòng)
- **Kích thước khóa:** 1 đến 256 byte
- **Kích thước state:** 256 byte (mảng S-box)
- **Ưu điểm:** Đơn giản, tốc độ nhanh
- **Ứng dụng:** WEP, WPA (TKIP), SSL/TLS (phiên bản cũ)

## Thuật toán RC4

RC4 gồm 2 pha chính:

### Pha 1: KSA (Key-Scheduling Algorithm)

Khởi tạo mảng hoán vị S[0..255] dựa trên khóa:

```
for i = 0 to 255:
    S[i] = i
    T[i] = Key[i mod keylen]

j = 0
for i = 0 to 255:
    j = (j + S[i] + T[i]) mod 256
    swap(S[i], S[j])
```

### Pha 2: PRGA (Pseudo-Random Generation Algorithm)

Sinh keystream và mã hóa từng byte:

```
i = 0, j = 0
for mỗi byte plaintext:
    i = (i + 1) mod 256
    j = (j + S[i]) mod 256
    swap(S[i], S[j])
    t = (S[i] + S[j]) mod 256
    k = S[t]                    ← byte keystream
    ciphertext = plaintext XOR k
```

## Yêu cầu hệ thống

- **Trình biên dịch C++:** GCC (g++) phiên bản 7.0 trở lên hoặc tương đương
- **Hệ điều hành:** Windows / Linux / macOS

## Biên dịch và chạy

### Sử dụng Makefile (Linux / macOS)

```bash
make        # Biên dịch
make run    # Biên dịch và chạy
make clean  # Xóa file thực thi
```

### Biên dịch thủ công

```bash
# Linux / macOS
g++ -Wall -Wextra -std=c++17 -o rc4_encryption rc4_encryption.cpp
./rc4_encryption

# Windows (MinGW)
g++ -Wall -Wextra -std=c++17 -o rc4_encryption.exe rc4_encryption.cpp
rc4_encryption.exe
```

## Ví dụ chạy chương trình

```
Nhap text can ma hoa RC4: hello
Nhap key RC4: secret

Text sau khi ma hoa: (ciphertext dạng ký tự hoặc hex)
```

> **Lưu ý:** Kết quả mã hóa là dữ liệu nhị phân, các ký tự output có thể không hiển thị được trên terminal. Đây là hành vi bình thường của mã hóa — ciphertext không phải là text đọc được.

## Cấu trúc project

```
rc4-encryption/
├── rc4_encryption.cpp   # Mã nguồn chính
├── Makefile             # Tự động hóa biên dịch
├── .gitignore           # Danh sách file bị bỏ qua bởi Git
├── .editorconfig        # Quy chuẩn coding style
├── LICENSE              # Giấy phép MIT
└── README.md            # Tài liệu hướng dẫn (file này)
```

## Tác giả

- **GitHub:** [thuanvd378](https://github.com/thuanvd378)
- **Trường:** Đại học Bách khoa Hà Nội (HUST)
- **Môn học:** An toàn thông tin

## Giấy phép

Project này được phân phối theo giấy phép [MIT](LICENSE).
