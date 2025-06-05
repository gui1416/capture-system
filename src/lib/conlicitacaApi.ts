// src/utils/conlicitacaoApi.ts
import axios, { AxiosError } from 'axios';

const BASE_URL = 'https://consultaonline.conlicitacao.com.br/api';
const TOKEN = process.env.CONLICITACAO_AUTH_TOKEN;

interface FiltroConlicitacao {
 id: number;
 descricao: string;
 ultimo_boletim?: {
  id: number;
  datahora_fechamento?: string;
  numero_edital?: string;
 }
}

interface FiltrosClienteResponse {
 filtros: FiltroConlicitacao[];
}

interface BoletimResumo {
 id: number;
 // adicione outros campos relevantes do boletim aqui
}

interface BoletimResponse {
 boletins: BoletimResumo[];
 // adicione outros campos de resposta se existirem
}

if (!TOKEN) {
 console.warn('⚠️ Token de autenticação da ConLicitação (CONLICITACAO_AUTH_TOKEN) não definido.');
}

export const conlicitacaoApi = axios.create({
 baseURL: BASE_URL,
 headers: {
  'x-auth-token': TOKEN || '',
  'Accept': 'application/json',
 },
 timeout: 25000
});

export interface ApiResponse<T = unknown> {
 success: boolean;
 data?: T;
 error?: string;
 status?: number;
}

export function handleApiError(error: unknown, defaultMessage: string): ApiResponse<never> {
 let message = defaultMessage;
 let status = 500;

 if (axios.isAxiosError(error)) {
  const axiosError = error as AxiosError<unknown>;
  status = axiosError.response?.status || 500;
  const data = axiosError.response?.data as { error?: string; message?: string } | undefined;
  const responseError = data?.error || data?.message;
  message = typeof responseError === 'string' ? responseError : axiosError.message || defaultMessage;

  console.error(`❌ ${defaultMessage} (Status: ${status})`);
  if (axiosError.response?.data) {
   console.error(`📩 Resposta da API:`, JSON.stringify(axiosError.response.data, null, 2));
  } else {
   console.error(` Rastreamento do erro Axios:`, axiosError.config?.url, axiosError.message);
  }

  if (status === 401 || status === 403) {
   message = "Erro de autenticação ou autorização com a API ConLicitação. Verifique o token e o IP cadastrado.";
  } else if (status === 404) {
   message = `Recurso não encontrado na API ConLicitação (${axiosError.config?.url}). Verifique o ID do filtro/boletim.`;
  } else if (status === 406) {
   message = `Erro 406 (Not Acceptable) da API ConLicitação. Verifique os cabeçalhos Accept ou possíveis problemas de IP/Token.`;
  }

 } else if (error instanceof Error) {
  message = error.message;
  console.error(`❌ ${defaultMessage} (Erro não-Axios):`, error);
 } else {
  console.error(`❌ ${defaultMessage} (Erro desconhecido):`, error);
 }

 return { success: false, error: message, status: status };
}

// Busca filtros disponíveis para o cliente
export async function getFiltrosCliente(): Promise<ApiResponse<FiltrosClienteResponse>> {
 try {
  console.log("📞 Chamando getFiltrosCliente...");
  const response = await conlicitacaoApi.get('/filtros');
  console.log("✅ Sucesso ao buscar filtros.");

  // --- CORREÇÃO DA VALIDAÇÃO ---
  // Verifica se a resposta tem 'data' e se 'data.filtros' é um array
  if (!response.data || !Array.isArray(response.data.filtros)) {
   console.error("❌ Estrutura inesperada na resposta de /filtros (esperado data.filtros como array):", response.data);
   // Mantém o log original para depuração
   console.error("   Resposta completa original:", JSON.stringify(response.data, null, 2));
   return { success: false, error: "Resposta da API de filtros inválida (estrutura inesperada).", status: 500 };
  }
  // --- FIM DA CORREÇÃO ---

  return { success: true, data: response.data, status: response.status };
 } catch (err: unknown) {
  return handleApiError(err, 'Erro ao buscar filtros do cliente');
 }
}


// Lista boletins de um filtro específico (mantida)
export async function getBoletins(
 filtroId: number,
 page = 1,
 perPage = 10
): Promise<ApiResponse<BoletimResponse>> {
 try {
  console.log(`📞 Chamando getBoletins para filtro ${filtroId}...`);
  const response = await conlicitacaoApi.get(
   `/filtro/${filtroId}/boletins?page=${page}&per_page=${perPage}&order=desc`
  );
  console.log(`✅ Sucesso ao buscar boletins para filtro ${filtroId}.`);
  if (!response.data || !Array.isArray(response.data.boletins)) {
   console.error(`❌ Estrutura inesperada na resposta de /filtro/${filtroId}/boletins:`, response.data);
   return { success: false, error: `Resposta da API de boletins (filtro ${filtroId}) inválida.`, status: 500 };
  }
  return { success: true, data: response.data, status: response.status };
 } catch (err: unknown) {
  return handleApiError(err, `Erro ao buscar boletins do filtro ${filtroId}`);
 }
}

// Detalha um boletim específico (mantida)
export async function getDetalhesBoletim(boletimId: number): Promise<ApiResponse<Record<string, unknown>>> {
 try {
  console.log(`📞 Chamando getDetalhesBoletim para boletim ${boletimId}...`);
  const response = await conlicitacaoApi.get(`/boletim/${boletimId}`);
  console.log(`✅ Sucesso ao buscar detalhes do boletim ${boletimId}.`);
  if (!response.data || typeof response.data !== 'object' || response.data === null || !('boletim' in response.data)) {
   console.error(`❌ Estrutura inesperada na resposta de /boletim/${boletimId}:`, response.data);
   return { success: false, error: `Resposta da API de detalhes do boletim ${boletimId} inválida.`, status: 500 };
  }
  return { success: true, data: response.data, status: response.status };
 } catch (err: unknown) {
  return handleApiError(err, `Erro ao buscar detalhes do boletim ${boletimId}`);
 }
}