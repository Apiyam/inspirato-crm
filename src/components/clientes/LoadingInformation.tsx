import { CircularProgress, Stack, Typography } from "@mui/joy";

type LoadingInformationProps = {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
}

export default function LoadingInformation({title='Cargando...', description='Espera un momento mientras se carga la información...', icon=null}: LoadingInformationProps) {
    return (
        <Stack direction="column" spacing={2} alignItems="center" justifyContent="center">
            {icon ? icon : <CircularProgress />}
            <Typography level="title-md">{title}</Typography>
            <Typography level="body-md">{description}</Typography>
        </Stack>
    );
}