# Nhóm tác giả

| Họ và tên | Mã số sinh viên |
|-----------|-----------------|
| Lê Việt Anh | 20233993 |
| Đoàn Sinh Đức | 20234000 |
| Vũ Đức Thuận | 20234039 |
| Cao Quang Hưng | 20234012 |

---

## 1. Cách sử dụng ứng dụng

### Cài đặt môi trường
Đảm bảo máy tính đã cài đặt Python 3.8+ và các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

### Khởi chạy ứng dụng
Để mở giao diện đồ họa, chạy lệnh:
```bash
python main_app.py
```

### Các bước thực hiện:
1.  **Nhập dữ liệu**:
    *   **📝 Nhập văn bản**: Gõ trực tiếp hoặc dán văn bản vào ô nhập liệu. Chọn loại ngôn ngữ (Tiếng Việt, Tiếng Anh, Tiếng Nhật,...) để phân loại.
    *   **📁 Đọc từ file**: Chọn file từ máy tính (.txt, .bin, ...). Ứng dụng hỗ trợ cả định dạng văn bản và nhị phân.
2.  **Phân tích**: Nhấn nút **"Thêm nguồn tin"** để đưa vào danh sách so sánh.
3.  **Xem kết quả**:
    *   **Bảng kết quả**: Hiển thị các chỉ số chi tiết (Entropy, H_max, Hiệu suất, Độ dư tương đối).
    *   **Biểu đồ**: Nhấn **"Vẽ biểu đồ"** để xem các biểu đồ so sánh trực quan.
    *   **Chi tiết**: Double-click vào một nguồn tin trong bảng để xem phân phối xác suất của từng ký tự.
4.  **Xuất báo cáo**: Nhấn **"Xuất kết quả"** để lưu các thông số phân tích ra file .txt.

---

## 2. Phần lý thuyết

### Entropy Shannon là gì?
Entropy ($H$) đo lường lượng thông tin trung bình của một nguồn tin. Công thức tính:
$$H(X) = -\sum_{i=1}^{n} p(x_i) \cdot \log_2(p(x_i))$$
*   **$p(x_i)$**: Xác suất xuất hiện của ký hiệu $x_i$.
*   **$H$ cao**: Nguồn tin ngẫu nhiên, khó dự đoán (chứa nhiều thông tin).
*   **$H$ thấp**: Nguồn tin có quy luật, dễ dự đoán (chứa ít thông tin).

### Các chỉ số quan trọng khác:

1.  **Entropy tối đa ($H_{max}$)**:
    Là giá trị Entropy lớn nhất mà một nguồn tin có thể đạt được với cùng một số lượng ký hiệu $n$. Điều này xảy ra khi tất cả các ký hiệu xuất hiện với xác suất bằng nhau ($p_1 = p_2 = ... = p_n = 1/n$).
    *   **Công thức**: 
    $$H_{max} = \log_2(n)$$
    *   **Ý nghĩa**: Đại diện cho khả năng chứa thông tin tối ưu của bảng chữ cái/nguồn tin.

2.  **Hiệu suất nguồn tin ($\eta$)**:
    Chỉ số đo lường mức độ tận dụng khả năng của nguồn tin. 
    *   **Công thức**: 
    $$\eta = \frac{H(X)}{H_{max}} \cdot 100\%$$
    *   **Ý nghĩa**: Hiệu suất càng cao (gần 100%) chứng tỏ các ký tự trong nguồn tin được phân bổ càng đồng đều, lượng thông tin truyền tải càng lớn trên mỗi đơn vị dữ liệu.

3.  **Độ dư tương đối ($R_s$)**:
    Phần dung lượng của nguồn tin dùng để chứa các thông tin mang tính lặp lại hoặc có thể suy luận được từ ngữ cảnh.
    *   **Công thức**: 
    $$R_s = \frac{H_{max} - H(X)}{H_{max}}$$
    *   **Ý nghĩa**: Trong ngôn ngữ tự nhiên, độ dư tương đối cao giúp con người có thể hiểu được thông báo ngay cả khi bị mất một vài ký tự trong quá trình truyền tin (nhờ ngữ pháp, ngữ cảnh).

---

## 3. Phần mô phỏng

Ứng dụng sử dụng thư viện **Matplotlib** để mô phỏng dữ liệu qua 4 loại biểu đồ:
1.  **So sánh Entropy**: So sánh lượng thông tin thực tế so với giới hạn tối đa của nguồn.
2.  **Hiệu suất sử dụng**: Đánh giá mức độ tối ưu của việc phân bổ ký tự trong ngôn ngữ.
3.  **Số ký hiệu khác nhau**: Thống kê độ phong phú của bảng chữ cái trong nguồn tin.
4.  **Phân phối xác suất**: Biểu đồ cột thể hiện các ký tự nào xuất hiện nhiều nhất (như 'e' trong tiếng Anh hay 'n/h' trong tiếng Việt).

---

## 4. Phần ứng dụng liên quan tới thực tế

1.  **Nén dữ liệu**: Entropy xác định giới hạn nén tối thiểu. Các thuật toán như ZIP, RAR hay Huffman Coding hoạt động dựa trên việc loại bỏ độ dư tương đối ($R_s$) để nén file.
2.  **Mã hóa và Bảo mật**: Dữ liệu đã mã hóa tốt phải có Entropy rất cao (gần như ngẫu nhiên) để hacker khó dự đoán quy luật.
3.  **Nhận dạng ngôn ngữ**: Mỗi ngôn ngữ có một "dân số" ký tự và giá trị Entropy đặc trưng. Ứng dụng này có thể giúp phân biệt sơ bộ các loại ngôn ngữ dựa trên phân phối xác suất.
4.  **Phân tích lỗi truyền tin**: Sử dụng Entropy để đánh giá độ nhiễu và chất lượng của việc truyền dữ liệu qua các kênh viễn thông.

---


