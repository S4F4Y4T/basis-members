const axios = require("axios");
const ExcelJS = require("exceljs");
const readline = require("readline");

// API URLs
const MEMBER_LIST_API = "https://basis.org.bd/get-member-list?team=";
const COMPANY_PROFILE_API = "https://basis.org.bd/get-company-profile/";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt user for input
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Fetch a specific page of members
async function fetchMemberList(page, perPage) {
  try {
    console.log(`Fetching page ${page} with ${perPage} records per page...`);
    const response = await axios.get(MEMBER_LIST_API, {
      params: {
        page: page,
        per_page: perPage,
      },
    });
    return response.data.data || []; // Assuming members are in `data.data`
  } catch (error) {
    console.error("Error fetching member list:", error.message);
    return [];
  }
}

// Fetch company profile by membership number
async function fetchCompanyProfile(membershipNo) {
  try {
    const response = await axios.get(`${COMPANY_PROFILE_API}${membershipNo}`);
    return response.data.member; // Assuming the profile data is directly available
  } catch (error) {
    console.error(`Error fetching profile for ${membershipNo}:`, error.message);
    return null;
  }
}

// Process data and save to Excel
async function processAndExport(page, perPage) {
  const members = await fetchMemberList(page, perPage);

  if (!members.length) {
    console.log("No data found for the specified page and per_page values.");
    return;
  }

  const results = [];
  console.log(`Found ${members.length} members. Fetching profiles...`);

  for (const member of members) {
    const profile = await fetchCompanyProfile(member.membership_no);
    if (profile) {
      results.push({
        membership_no: member.membership_no,
        company_name: member.company_name || "",
        short_profile: member.short_profile || "",
        address: profile.address || "",
        email: profile.email || "",
        website: profile.website || "",
        phone: profile.phone || "",
        primary_rep_name: profile.representatives_primary?.name || "",
        primary_rep_email: profile.representatives_primary?.email || "",
        primary_rep_designation: profile.representatives_primary?.designation || "",
        primary_rep_mobile: profile.representatives_primary?.mobile || "",
      });
    }
  }

  // Save to Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Company Data");

  worksheet.columns = [
    { header: "Membership No", key: "membership_no", width: 20 },
    { header: "Company Name", key: "company_name", width: 30 },
    { header: "Short Profile", key: "short_profile", width: 50 },
    { header: "Address", key: "address", width: 50 },
    { header: "Email", key: "email", width: 30 },
    { header: "Website", key: "website", width: 30 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Rep Name", key: "primary_rep_name", width: 25 },
    { header: "Rep Email", key: "primary_rep_email", width: 30 },
    { header: "Rep Designation", key: "primary_rep_designation", width: 25 },
    { header: "Rep Mobile", key: "primary_rep_mobile", width: 20 },
  ];

  worksheet.addRows(results);

  const fileName = `CompanyData_Page${page}_PerPage${perPage}.xlsx`;
  await workbook.xlsx.writeFile(fileName);

  console.log(`Data saved to ${fileName}`);
}

// Main Function to Run the Script
async function main() {
  try {
    const page = parseInt(await askQuestion("Enter the page number: "), 10);
    const perPage = parseInt(await askQuestion("Enter the number of records per page: "), 10);

    if (isNaN(page) || isNaN(perPage) || page <= 0 || perPage <= 0) {
      console.log("Invalid input. Please enter positive numbers for page and per_page.");
      rl.close();
      return;
    }

    await processAndExport(page, perPage);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    rl.close();
  }
}

main();

