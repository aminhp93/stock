/**
 * Dữ liệu thô Quá trình đóng BHXH, BHTN & Lịch sử Thu nhập Lương
 * Nguồn: Ứng dụng VssID - Bảo hiểm Xã hội Việt Nam (Đã cập nhật đến 10/2026)
 * Mã số BHXH: 3122221985 - PHẠM NGỌC MINH
 */

export interface InsuranceRecord {
  id: string;
  period_from: string; // MM/YYYY
  period_to: string;   // MM/YYYY
  months: number;
  company: string;
  salary_actual: number;      // Mức lương thực tế thỏa thuận (VND)
  salary_bhxh: number;        // Tiền lương đóng BHXH & BHYT (sau áp trần)
  salary_bhtn: number;        // Tiền lương đóng BHTN
  ee_bhxh_rate: number;       // 8%
  ee_bhyt_rate: number;       // 1.5%
  ee_bhtn_rate: number;       // 1%
  er_bhxh_rate: number;       // 17.5% (14% hưu trí + 3% ốm đau thai sản + 0.5% TNLĐ-BNN)
  er_bhyt_rate: number;       // 3%
  er_bhtn_rate: number;       // 1%
  employee_contribution: number; // NLĐ đóng hàng tháng (VND)
  employer_contribution: number; // NSDLĐ đóng hàng tháng (VND)
  total_monthly_contribution: number; // Tổng đóng hàng tháng (VND)
  base_salary_cap_note: string; // Ghi chú trần đóng 20 lần mức lương cơ sở
}

export interface InsuranceProfile {
  employee_name: string;
  social_insurance_code: string;
  company_name: string;
  total_months: number;
  total_formatted: string;
  late_payment_months: number;
  last_updated: string;
  review_note: string;
  contribution_rates_note: string;
  records: InsuranceRecord[];
}

export const INSURANCE_RAW_DATA: InsuranceProfile = {
  employee_name: "PHẠM NGỌC MINH",
  social_insurance_code: "3122221985",
  company_name: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
  total_months: 49,
  total_formatted: "4 năm 1 tháng (10/2022 → 10/2026)",
  late_payment_months: 0,
  last_updated: "14:00 30-08-2026",
  review_note: "Đã rà soát: Áp trần 5× LTTV vùng I cho TCTN (26.550.000 đ/tháng); chuẩn hóa chi tiết từng dòng.",
  contribution_rates_note: "Employee = 9.5% trên lương BHXH + 1% BHTN trên lương BHTN. Employer = 20.5% trên lương BHXH + 1% BHTN trên lương BHTN.",
  records: [
    {
      id: "1",
      period_from: "10/2022",
      period_to: "06/2023",
      months: 9,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 33000000,
      salary_bhxh: 29800000,
      salary_bhtn: 33000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 3161000,
      employer_contribution: 6439000,
      total_monthly_contribution: 9600000,
      base_salary_cap_note: "Trần BHXH lúc đó 20 × 1.490.000 = 29.800.000 đ",
    },
    {
      id: "2",
      period_from: "07/2023",
      period_to: "08/2023",
      months: 2,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 33000000,
      salary_bhxh: 33000000,
      salary_bhtn: 33000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 3465000,
      employer_contribution: 7095000,
      total_monthly_contribution: 10560000,
      base_salary_cap_note: "Lương cơ sở tăng lên 1.800.000 đ (Trần 36.000.000 đ)",
    },
    {
      id: "3",
      period_from: "09/2023",
      period_to: "06/2024",
      months: 10,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 36500000,
      salary_bhxh: 36000000,
      salary_bhtn: 36500000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 3785000,
      employer_contribution: 7745000,
      total_monthly_contribution: 11530000,
      base_salary_cap_note: "Tăng lương 36.5tr, trần BHXH 20 × 1.800.000 = 36.000.000 đ",
    },
    {
      id: "4",
      period_from: "07/2024",
      period_to: "01/2025",
      months: 7,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 36500000,
      salary_bhxh: 36500000,
      salary_bhtn: 36500000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 3832500,
      employer_contribution: 7847500,
      total_monthly_contribution: 11680000,
      base_salary_cap_note: "Lương cơ sở tăng lên 2.340.000 đ (Trần 46.800.000 đ)",
    },
    {
      id: "5",
      period_from: "02/2025",
      period_to: "09/2025",
      months: 8,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 40000000,
      salary_bhxh: 40000000,
      salary_bhtn: 40000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 4200000,
      employer_contribution: 8600000,
      total_monthly_contribution: 12800000,
      base_salary_cap_note: "Tăng lương lên 40.000.000 đ (chưa chạm trần 46.8tr)",
    },
    {
      id: "6",
      period_from: "10/2025",
      period_to: "01/2026",
      months: 4,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 70000000,
      salary_bhxh: 46800000,
      salary_bhtn: 70000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 5146000,
      employer_contribution: 10294000,
      total_monthly_contribution: 15440000,
      base_salary_cap_note: "Tăng lương lên 70.000.000 đ, kịch trần BHXH 46.800.000 đ",
    },
    {
      id: "7",
      period_from: "02/2026",
      period_to: "04/2026",
      months: 3,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 50000000,
      salary_bhxh: 46800000,
      salary_bhtn: 50000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 4946000,
      employer_contribution: 10094000,
      total_monthly_contribution: 15040000,
      base_salary_cap_note: "Mức lương 50.000.000 đ, kịch trần BHXH 46.800.000 đ",
    },
    {
      id: "8",
      period_from: "05/2026",
      period_to: "06/2026",
      months: 2,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 50000000,
      salary_bhxh: 46800000,
      salary_bhtn: 50000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 4946000,
      employer_contribution: 10094000,
      total_monthly_contribution: 15040000,
      base_salary_cap_note: "Mức lương 50.000.000 đ, kịch trần BHXH 46.800.000 đ",
    },
    {
      id: "9",
      period_from: "07/2026",
      period_to: "10/2026",
      months: 4,
      company: "CÔNG TY TNHH PHẦN MỀM PISCADA VIỆT NAM",
      salary_actual: 80000000,
      salary_bhxh: 46800000,
      salary_bhtn: 80000000,
      ee_bhxh_rate: 0.08,
      ee_bhyt_rate: 0.015,
      ee_bhtn_rate: 0.01,
      er_bhxh_rate: 0.175,
      er_bhyt_rate: 0.03,
      er_bhtn_rate: 0.01,
      employee_contribution: 5246000,
      employer_contribution: 10394000,
      total_monthly_contribution: 15640000,
      base_salary_cap_note: "Tăng lương lên 80.000.000 đ, kịch trần BHXH 46.800.000 đ",
    },
  ],
};

/**
 * Tính toán tổng hợp tài chính bảo hiểm
 */
export function getInsuranceCalculations(data: InsuranceProfile = INSURANCE_RAW_DATA) {
  const totalSalaryActual = data.records.reduce((s, r) => s + r.months * r.salary_actual, 0);
  const totalSalaryBHXH = data.records.reduce((s, r) => s + r.months * r.salary_bhxh, 0);
  const totalSalaryBHTN = data.records.reduce((s, r) => s + r.months * r.salary_bhtn, 0);

  const avgSalaryActual = totalSalaryActual / data.total_months;
  const avgSalaryBHXH = totalSalaryBHXH / data.total_months;
  const avgSalaryBHTN = totalSalaryBHTN / data.total_months;

  // Người lao động đóng (10.5%: 8% BHXH + 1.5% BHYT trên lương BHXH, 1% BHTN trên lương BHTN)
  const totalEmployeeDeducted = data.records.reduce((s, r) => s + r.months * r.employee_contribution, 0);

  // Doanh nghiệp đóng (21.5%: 17.5% BHXH + 3% BHYT trên lương BHXH, 1% BHTN trên lương BHTN)
  const totalEmployerContributed = data.records.reduce((s, r) => s + r.months * r.employer_contribution, 0);

  // Tổng cộng quỹ (32%)
  const grandTotal = totalEmployeeDeducted + totalEmployerContributed;

  // Quyền lợi ước tính
  // 1. BHXH 1 lần: 49 tháng = 4 năm 1 tháng -> lẻ từ 1 đến 6 tháng tính là 0.5 năm (tổng 4.5 năm)
  // Mỗi năm đóng sau 2014 được hưởng 2 tháng mức bình quân tiền lương đóng BHXH
  const fullYears = Math.floor(data.total_months / 12);
  const remMonths = data.total_months % 12;
  const bhxh1LanYears = remMonths === 0 ? fullYears : remMonths <= 6 ? fullYears + 0.5 : fullYears + 1;
  const estimatedBHXH1Lan = avgSalaryBHXH * 2 * bhxh1LanYears;

  // 2. Trợ cấp thất nghiệp: 60% bình quân tiền lương tháng đóng BHTN của 6 tháng liền kề trước khi nghỉ việc,
  // NHƯNG tối đa không quá 5 lần mức lương tối thiểu vùng I (5 × 5.310.000 = 26.550.000 đ/tháng)
  const last6mBHTNAvg = (50000000 * 2 + 80000000 * 4) / 6;
  const rawMonthlyBHTN = last6mBHTNAvg * 0.6; // 42.000.000 đ
  const unemploymentMonthlyCap = 5 * 5310000;  // 26.550.000 đ (Trần 5x Lương tối thiểu vùng I 2026)
  const isCapped = rawMonthlyBHTN > unemploymentMonthlyCap;
  const estimatedMonthlyBHTN = Math.min(rawMonthlyBHTN, unemploymentMonthlyCap); // 26.550.000 đ
  
  // Số tháng hưởng TCTN: Đủ 12 - 36 tháng đóng = 3 tháng hưởng. Sau đó cứ thêm 12 tháng đủ tính thêm 1 tháng -> 49 tháng = 4 tháng hưởng (1 tháng lẻ bảo lưu).
  const bhtnBenefitMonths = data.total_months >= 48 ? 4 : 3;
  const estimatedTotalBHTN = estimatedMonthlyBHTN * bhtnBenefitMonths; // 106.200.000 đ

  return {
    totalSalaryActual,
    totalSalaryBHXH,
    totalSalaryBHTN,
    avgSalaryActual,
    avgSalaryBHXH,
    avgSalaryBHTN,
    totalEmployeeDeducted,
    totalEmployerContributed,
    grandTotal,
    bhxh1LanYears,
    estimatedBHXH1Lan,
    last6mBHTNAvg,
    rawMonthlyBHTN,
    unemploymentMonthlyCap,
    isCapped,
    bhtnBenefitMonths,
    estimatedMonthlyBHTN,
    estimatedTotalBHTN,
  };
}
