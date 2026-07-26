# GF(2¹⁰) Modular Inverse — Extended Euclidean Algorithm

Cài đặt thuật toán **Euclidean mở rộng** (Extended Euclidean Algorithm) để tìm **nghịch đảo nhân** của một phần tử trong trường hữu hạn **GF(2¹⁰)**, với đa thức tối giản **m(x) = x¹⁰ + x³ + 1**.

## Đề bài

> Cài đặt thuật toán Euclidean mở rộng để tìm nghịch đảo nhân của một số trong trường GF(2¹⁰), với đa thức tối giản là m(x) = x¹⁰ + x³ + 1.
>
> **Test vector:** a = 523, b = 1015. Tìm a⁻¹, b⁻¹.
>
> In ra từng giá trị trung gian của các bước tính số dư và nhân cho đến khi kết thúc thuật toán.

## Mô tả

Trong trường hữu hạn GF(2¹⁰), mỗi phần tử được biểu diễn bằng một đa thức bậc tối đa 9 với hệ số thuộc GF(2) (tức là 0 hoặc 1). Nghịch đảo nhân của phần tử `a(x)` là phần tử `a⁻¹(x)` thỏa mãn:

```
a(x) · a⁻¹(x) ≡ 1  (mod m(x))
```

Trong đó `m(x) = x¹⁰ + x³ + 1` là đa thức tối giản (bất khả quy) của trường.

## Các hàm trong chương trình

| Hàm | Chức năng |
|---|---|
| `bac_da_thuc(x)` | Tính bậc của đa thức (biểu diễn dưới dạng số nguyên) |
| `nhan_da_thuc(a, b)` | Nhân hai đa thức trong GF(2) bằng phương pháp shift-and-XOR |
| `chia_da_thuc(A, B, Q, R)` | Chia đa thức A cho B, trả về thương Q và dư R |
| `tim_nghich_dao(a, m)` | Tìm nghịch đảo của a modulo m bằng Extended Euclidean Algorithm |

## Biểu diễn đa thức bằng số nguyên

Mỗi đa thức được biểu diễn dưới dạng **số nguyên** bằng biểu diễn nhị phân. Mỗi bit tương ứng với hệ số của một bậc:

```
m(x) = x¹⁰ + x³ + 1
     = 10000001001 (nhị phân)
     = 1033 (thập phân)

a(x) = 523 = 1000001011 (nhị phân)
     = x⁹ + x³ + x + 1

b(x) = 1015 = 1111110111 (nhị phân)
     = x⁹ + x⁸ + x⁷ + x⁶ + x⁵ + x⁴ + x² + x + 1
```

## Thuật toán Extended Euclidean trên GF(2¹⁰)

**Mục tiêu:** Cho `a(x)` và đa thức tối giản `m(x)`, tìm `a⁻¹(x)` sao cho `a(x) · a⁻¹(x) ≡ 1 (mod m(x))`.

**Các bước:**

1. **Khởi tạo:** `r₁ = m(x)`, `r₂ = a(x)`, `t₁ = 0`, `t₂ = 1`
2. **Lặp** cho đến khi `r₂ = 0`:
   - Chia đa thức: `r₁ = q(x) · r₂ + r` → tìm thương `q` và dư `r`
   - Tính: `t = t₁ ⊕ (q · t₂)` (phép nhân đa thức rồi XOR)
   - Cập nhật: `r₁ ← r₂`, `r₂ ← r`, `t₁ ← t₂`, `t₂ ← t`
3. **Kết quả:** `a⁻¹(x) = t₁`

> **Lưu ý:** Trên GF(2), phép cộng và phép trừ đều là phép XOR (⊕).

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
g++ -Wall -Wextra -std=c++17 -o gf2m_modular_inverse gf2m_modular_inverse.cpp
./gf2m_modular_inverse

# Windows (MinGW)
g++ -Wall -Wextra -std=c++17 -o gf2m_modular_inverse.exe gf2m_modular_inverse.cpp
gf2m_modular_inverse.exe
```

## Kết quả chạy chương trình

Chương trình in ra **từng giá trị trung gian** của các bước tính số dư và nhân:

```
--- Tim nghich dao cua 523 ---
Phep chia r: 1033 / 523 duoc thuong q = 2, so du r = 31
Phep nhan: q * t2 = 2 * 1 = 2
Tinh t moi: t1 ^ (q * t2) = 0 ^ 2 = 2

Phep chia r: 523 / 31 duoc thuong q = 49, so du r = 4
Phep nhan: q * t2 = 49 * 2 = 98
Tinh t moi: t1 ^ (q * t2) = 1 ^ 98 = 99

Phep chia r: 31 / 4 duoc thuong q = 7, so du r = 3
Phep nhan: q * t2 = 7 * 99 = 297
Tinh t moi: t1 ^ (q * t2) = 2 ^ 297 = 299

Phep chia r: 4 / 3 duoc thuong q = 3, so du r = 1
Phep nhan: q * t2 = 3 * 299 = 893
Tinh t moi: t1 ^ (q * t2) = 99 ^ 893 = 798

Phep chia r: 3 / 1 duoc thuong q = 3, so du r = 0
Phep nhan: q * t2 = 3 * 798 = 1314
Tinh t moi: t1 ^ (q * t2) = 299 ^ 1314 = 1033

Nghich dao cua 523 la: 798

--- Tim nghich dao cua 1015 ---
Phep chia r: 1033 / 1015 duoc thuong q = 3, so du r = 16
Phep nhan: q * t2 = 3 * 1 = 3
Tinh t moi: t1 ^ (q * t2) = 0 ^ 3 = 3

Phep chia r: 1015 / 16 duoc thuong q = 63, so du r = 7
Phep nhan: q * t2 = 63 * 3 = 65
Tinh t moi: t1 ^ (q * t2) = 1 ^ 65 = 64

Phep chia r: 16 / 7 duoc thuong q = 6, so du r = 2
Phep nhan: q * t2 = 6 * 64 = 384
Tinh t moi: t1 ^ (q * t2) = 3 ^ 384 = 387

Phep chia r: 7 / 2 duoc thuong q = 3, so du r = 1
Phep nhan: q * t2 = 3 * 387 = 645
Tinh t moi: t1 ^ (q * t2) = 64 ^ 645 = 709

Phep chia r: 2 / 1 duoc thuong q = 2, so du r = 0
Phep nhan: q * t2 = 2 * 709 = 1418
Tinh t moi: t1 ^ (q * t2) = 387 ^ 1418 = 1033

Nghich dao cua 1015 la: 709
```

### Kết quả

| Phần tử | Nghịch đảo |
|---|---|
| a = 523 | a⁻¹ = **798** |
| b = 1015 | b⁻¹ = **709** |

## Cấu trúc project

```
gf2m-modular-inverse/
├── gf2m_modular_inverse.cpp   # Mã nguồn chính
├── Makefile                   # Tự động hóa biên dịch
├── .gitignore                 # Danh sách file bị bỏ qua bởi Git
├── .editorconfig              # Quy chuẩn coding style
├── LICENSE                    # Giấy phép MIT
└── README.md                  # Tài liệu hướng dẫn (file này)
```

## Tác giả

- **GitHub:** [thuanvd378](https://github.com/thuanvd378)
- **Trường:** Đại học Bách khoa Hà Nội 
- **MSSV:** 20234039
- **Môn học:** An toàn thông tin

## Giấy phép

Project này được phân phối theo giấy phép [MIT](LICENSE).
