import { phpApiRequest } from "@/lib/phpApi";

// Update customer statistics after sale
export async function updateCustomerSaleStats(customerId: string, saleTotal: number) {
  if (!customerId) return;

  try {
    const customer = await phpApiRequest<{ total_purchases?: number | null; is_frequent?: number | boolean }>(
      `/customers.php?id=${encodeURIComponent(customerId)}`,
      { method: "GET" }
    );

    const newTotal = (Number(customer.total_purchases) || 0) + saleTotal;

    await phpApiRequest(
      `/customers.php?id=${encodeURIComponent(customerId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          is_frequent: newTotal >= 5000,
        }),
      }
    );
  } catch (error) {
    console.error("Error updating customer sale stats:", error);
    return;
  }
}

// Update customer statistics after service
export async function updateCustomerServiceStats(customerId: string) {
  if (!customerId) return;

  try {
    await phpApiRequest(
      `/customers.php?id=${encodeURIComponent(customerId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          is_frequent: true,
        }),
      }
    );
  } catch (error) {
    console.error("Error updating customer service stats:", error);
  }
}
